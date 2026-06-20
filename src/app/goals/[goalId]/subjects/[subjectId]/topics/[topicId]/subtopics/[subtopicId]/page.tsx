"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  PenTool,
  Pencil,
  FolderOpen,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  PencilLine,
  Eye,
  Save,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header, BreadcrumbEntry } from "@/components/header";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Whiteboard } from "@/components/whiteboard";
import { SketchBoard } from "@/components/sketchboard";
import { FileManager } from "@/components/file-manager";
import { SubtopicNotesViewer } from "@/components/subtopic-notes-viewer";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/stores/auth-store";
import { useGoalStore } from "@/stores/goal-store";
import { useSubjectStore } from "@/stores/subject-store";
import { useTopicStore } from "@/stores/topic-store";
import { useSubTopicStore } from "@/stores/subtopic-store";
import { MasteryLevel } from "@/types";

type Mode = "view" | "edit";
type Tab = "notes" | "sketchboard" | "whiteboard" | "files";

const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

const tabsDef: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "notes", label: "Notes", icon: <FileText className="h-4 w-4" /> },
  { id: "sketchboard", label: "Sketch", icon: <Pencil className="h-4 w-4" /> },
  { id: "whiteboard", label: "Whiteboard", icon: <PenTool className="h-4 w-4" /> },
  { id: "files", label: "Files", icon: <FolderOpen className="h-4 w-4" /> },
];

const masteryConfig: Record<MasteryLevel, { label: string; className: string }> = {
  NOT_STARTED: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  BEGINNER: { label: "Beginner", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  INTERMEDIATE: { label: "Intermediate", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400" },
  ADVANCED: { label: "Advanced", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  MASTERED: { label: "Mastered", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
};

export default function SubtopicDetailPage() {
  return (
    <AuthGuard>
      <SubtopicDetailContent />
    </AuthGuard>
  );
}

function SubtopicDetailContent() {
  const params = useParams<{
    goalId: string;
    subjectId: string;
    topicId: string;
    subtopicId: string;
  }>();
  const { goalId, subjectId, topicId, subtopicId } = params;

  const { user } = useAuthStore();
  const { activeGoal, goals, setActiveGoal, fetchGoals } = useGoalStore();
  const { activeSubject, subjects, setActiveSubject, fetchSubjects } = useSubjectStore();
  const { activeTopic, topics, setActiveTopic, fetchTopics } = useTopicStore();
  const { subtopics, fetchSubTopics, saveNotes } = useSubTopicStore();

  const [mode, setMode] = useState<Mode>("view");
  const [activeTab, setActiveTab] = useState<Tab>("notes");

  // Notes content — initialised from server data
  const [notesHtml, setNotesHtml] = useState("");
  const [sketchDataUrl, setSketchDataUrl] = useState<string | undefined>();
  const [whiteboardDataUrl, setWhiteboardDataUrl] = useState<string | undefined>();

  // Dirty tracking
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savedSnapshotRef = useRef({ notes: "", sketch: "", whiteboard: "" });

  // Fetch hierarchy data
  useEffect(() => {
    if (user && goals.length === 0) fetchGoals(user.id);
  }, [user, goals.length, fetchGoals]);

  useEffect(() => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) setActiveGoal(goal);
  }, [goals, goalId, setActiveGoal]);

  useEffect(() => {
    if (subjects.length === 0) fetchSubjects(goalId);
  }, [subjects.length, goalId, fetchSubjects]);

  useEffect(() => {
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject) setActiveSubject(subject);
  }, [subjects, subjectId, setActiveSubject]);

  useEffect(() => {
    if (topics.length === 0) fetchTopics(subjectId);
  }, [topics.length, subjectId, fetchTopics]);

  useEffect(() => {
    const topic = topics.find((t) => t.id === topicId);
    if (topic) setActiveTopic(topic);
  }, [topics, topicId, setActiveTopic]);

  useEffect(() => {
    if (subtopics.length === 0) fetchSubTopics(topicId);
  }, [subtopics.length, topicId, fetchSubTopics]);

  const subtopic = subtopics.find((st) => st.id === subtopicId);

  // Initialise local state from server data (once loaded)
  const [initialised, setInitialised] = useState(false);
  useEffect(() => {
    if (subtopic && !initialised) {
      const notes = subtopic.notes_html || "";
      const sketch = subtopic.sketch_data_url || "";
      const whiteboard = subtopic.whiteboard_data_url || "";
      setNotesHtml(notes);
      setSketchDataUrl(sketch || undefined);
      setWhiteboardDataUrl(whiteboard || undefined);
      savedSnapshotRef.current = { notes, sketch, whiteboard };
      setInitialised(true);
    }
  }, [subtopic, initialised]);

  // Dirty detection
  useEffect(() => {
    if (!initialised) return;
    const snap = savedSnapshotRef.current;
    const dirty =
      notesHtml !== snap.notes ||
      (sketchDataUrl || "") !== snap.sketch ||
      (whiteboardDataUrl || "") !== snap.whiteboard;
    setIsDirty(dirty);
  }, [notesHtml, sketchDataUrl, whiteboardDataUrl, initialised]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    try {
      await saveNotes(topicId, subtopicId, {
        notes_html: notesHtml,
        sketch_data_url: sketchDataUrl || null,
        whiteboard_data_url: whiteboardDataUrl || null,
      });
      savedSnapshotRef.current = {
        notes: notesHtml,
        sketch: sketchDataUrl || "",
        whiteboard: whiteboardDataUrl || "",
      };
      setIsDirty(false);
    } catch {
      // TODO: show error toast
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, isSaving, notesHtml, sketchDataUrl, whiteboardDataUrl, topicId, subtopicId, saveNotes]);

  // Auto-save every 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      if (isDirty && !isSaving) {
        handleSave();
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(timer);
  }, [isDirty, isSaving, handleSave]);

  // Ctrl+S / Cmd+S save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave]);

  const mastery = subtopic ? masteryConfig[subtopic.mastery_level] : null;
  const accuracy =
    subtopic && subtopic.questions_solved > 0
      ? Math.round((subtopic.questions_correct / subtopic.questions_solved) * 100)
      : 0;
  const confidencePercent = subtopic
    ? Math.round(subtopic.confidence_level * 100)
    : 0;

  const breadcrumbs: BreadcrumbEntry[] = [
    { label: activeGoal?.title || "Goal", href: `/goals/${goalId}` },
    {
      label: activeSubject?.name || "Subject",
      href: `/goals/${goalId}/subjects/${subjectId}`,
    },
    {
      label: activeTopic?.name || "Topic",
      href: `/goals/${goalId}/subjects/${subjectId}`,
    },
    { label: subtopic?.name || "Subtopic" },
  ];

  const viewContent = () => {
    switch (activeTab) {
      case "notes":
        return (
          <SubtopicNotesViewer
            notesHtml={notesHtml}
            sketchDataUrl={undefined}
            whiteboardDataUrl={undefined}
          />
        );
      case "sketchboard":
        return sketchDataUrl ? (
          <div className="flex items-center justify-center h-full">
            <img
              src={sketchDataUrl}
              alt="Sketch"
              className="max-w-full max-h-full object-contain rounded-lg border bg-white dark:bg-zinc-900"
            />
          </div>
        ) : (
          <EmptyState message="No sketch yet. Switch to edit mode to start drawing." />
        );
      case "whiteboard":
        return whiteboardDataUrl ? (
          <div className="flex items-center justify-center h-full">
            <img
              src={whiteboardDataUrl}
              alt="Whiteboard"
              className="max-w-full max-h-full object-contain rounded-lg border bg-white dark:bg-zinc-900"
            />
          </div>
        ) : (
          <EmptyState message="No whiteboard yet. Switch to edit mode to start drawing." />
        );
      case "files":
        return <EmptyState message="No files yet. Switch to edit mode to upload files." />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header breadcrumbs={breadcrumbs} />

      {/* Toolbar bar */}
      <div className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center gap-3 px-4 py-2">
          {/* Left: subtopic name + mastery badge */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h1 className="text-base font-semibold truncate">
              {subtopic?.name || "Loading..."}
            </h1>
            {mastery && (
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] px-1.5 py-0 ${mastery.className}`}
              >
                {mastery.label}
              </Badge>
            )}
          </div>

          {/* Right: stats (desktop) + dropdown + save + edit */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Inline stats — hidden on small screens */}
            {subtopic && (
              <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground mr-2">
                <span className="flex items-center gap-1">
                  <RotateCcw className="h-3 w-3 text-primary" />
                  {subtopic.revision_count} rev
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                  {subtopic.questions_solved > 0 ? `${accuracy}%` : "--"}
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  {subtopic.mistake_count} mistakes
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {subtopic.questions_correct}/{subtopic.questions_solved}
                </span>
                <span className="flex items-center gap-1.5">
                  <Progress value={confidencePercent} className="h-1.5 w-16" />
                  {confidencePercent}%
                </span>
              </div>
            )}

            {/* Content type dropdown */}
            <Select value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tabsDef.map((tab) => (
                  <SelectItem key={tab.id} value={tab.id}>
                    <div className="flex items-center gap-2">
                      {tab.icon}
                      {tab.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Save button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={!isDirty || isSaving}
              onClick={handleSave}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isSaving ? "Saving..." : "Save"}
            </Button>

            {/* Edit / View toggle */}
            <Button
              variant={mode === "edit" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setMode(mode === "view" ? "edit" : "view")}
            >
              {mode === "edit" ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  View
                </>
              ) : (
                <>
                  <PencilLine className="h-3.5 w-3.5" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="h-[calc(100vh-10rem)]">
          {mode === "view" && (
            <div className="h-full">{viewContent()}</div>
          )}

          {/* Keep editor mounted (hidden when not active) to prevent content loss.
              Only render after data is loaded so the editor initialises with correct content. */}
          {initialised && (
            <div className={mode === "edit" && activeTab === "notes" ? "h-full" : "hidden"}>
              <RichTextEditor
                content={notesHtml}
                onChange={setNotesHtml}
                placeholder="Write your study notes here..."
              />
            </div>
          )}

          {mode === "edit" && activeTab === "sketchboard" && (
            <div className="h-full">
              <SketchBoard />
            </div>
          )}
          {mode === "edit" && activeTab === "whiteboard" && (
            <div className="h-full">
              <Whiteboard />
            </div>
          )}
          {mode === "edit" && activeTab === "files" && (
            <div className="h-full">
              <FileManager />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <FileText className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
  );
}
