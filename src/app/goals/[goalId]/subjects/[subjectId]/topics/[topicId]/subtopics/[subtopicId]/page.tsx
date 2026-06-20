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
  BarChart3,
  Plus,
  Minus,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Header, BreadcrumbEntry } from "@/components/header";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Whiteboard } from "@/components/whiteboard";
import { SketchBoard } from "@/components/sketchboard";
import { FileManager } from "@/components/file-manager";
import { SubtopicNotesViewer } from "@/components/subtopic-notes-viewer";
import { QuestionList } from "@/components/question-list";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/stores/auth-store";
import { useGoalStore } from "@/stores/goal-store";
import { useSubjectStore } from "@/stores/subject-store";
import { useTopicStore } from "@/stores/topic-store";
import { useSubTopicStore } from "@/stores/subtopic-store";
import { useQuestionStore } from "@/stores/question-store";
import { MasteryLevel } from "@/types";

type Mode = "view" | "edit";
type Tab = "notes" | "sketchboard" | "whiteboard" | "files" | "questions";

const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

const tabsDef: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "notes", label: "Notes", icon: <FileText className="h-4 w-4" /> },
  { id: "sketchboard", label: "Sketch", icon: <Pencil className="h-4 w-4" /> },
  { id: "whiteboard", label: "Whiteboard", icon: <PenTool className="h-4 w-4" /> },
  { id: "files", label: "Files", icon: <FolderOpen className="h-4 w-4" /> },
  { id: "questions", label: "Questions", icon: <HelpCircle className="h-4 w-4" /> },
];

const masteryOptions: { value: MasteryLevel; label: string; className: string }[] = [
  { value: "NOT_STARTED", label: "Not Started", className: "bg-muted text-muted-foreground" },
  { value: "BEGINNER", label: "Beginner", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  { value: "INTERMEDIATE", label: "Intermediate", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400" },
  { value: "ADVANCED", label: "Advanced", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  { value: "MASTERED", label: "Mastered", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
];

const masteryConfig: Record<MasteryLevel, { label: string; className: string }> = Object.fromEntries(
  masteryOptions.map((o) => [o.value, { label: o.label, className: o.className }])
) as Record<MasteryLevel, { label: string; className: string }>;

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
  const {
    subtopics,
    fetchSubTopics,
    saveNotes,
    recordRevision,
    updatePerformance,
    updateMastery,
    updateConfidence,
  } = useSubTopicStore();
  const { questions, fetchQuestions } = useQuestionStore();

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

  useEffect(() => {
    fetchQuestions(subtopicId);
  }, [subtopicId, fetchQuestions]);

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

  const hasSketch = !!sketchDataUrl;
  const hasWhiteboard = !!whiteboardDataUrl;
  const hasFiles = (subtopic?.files?.length ?? 0) > 0;
  const questionCount = questions.length;
  const fileCount = subtopic?.files?.length ?? 0;

  // Collect available content indicators (excluding the currently active tab)
  const contentIndicators: { tab: Tab; icon: React.ReactNode; label: string; detail: string; preview?: React.ReactNode }[] = [];
  if (hasSketch && activeTab !== "sketchboard") {
    contentIndicators.push({
      tab: "sketchboard",
      icon: <Pencil className="h-4 w-4 text-orange-500" />,
      label: "Sketch",
      detail: "Hand-drawn sketch available",
    });
  }
  if (hasWhiteboard && activeTab !== "whiteboard") {
    contentIndicators.push({
      tab: "whiteboard",
      icon: <PenTool className="h-4 w-4 text-blue-500" />,
      label: "Whiteboard",
      detail: "Whiteboard drawing available",
    });
  }
  if (questionCount > 0 && activeTab !== "questions") {
    contentIndicators.push({
      tab: "questions",
      icon: <HelpCircle className="h-4 w-4 text-purple-500" />,
      label: "Questions",
      detail: `${questionCount} question${questionCount !== 1 ? "s" : ""}`,
    });
  }
  if (hasFiles && activeTab !== "files") {
    contentIndicators.push({
      tab: "files",
      icon: <FolderOpen className="h-4 w-4 text-green-500" />,
      label: "Files",
      detail: `${fileCount} file${fileCount !== 1 ? "s" : ""} attached`,
    });
  }

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
          <div className="h-full">
            <SketchBoard initialData={sketchDataUrl} readOnly />
          </div>
        ) : (
          <EmptyState message="No sketch yet. Switch to edit mode to start drawing." />
        );
      case "whiteboard":
        return whiteboardDataUrl ? (
          <div className="h-full">
            <Whiteboard initialData={whiteboardDataUrl} />
          </div>
        ) : (
          <EmptyState message="No whiteboard yet. Switch to edit mode to start drawing." />
        );
      case "files":
        return <EmptyState message="No files yet. Switch to edit mode to upload files." />;
      case "questions":
        return <QuestionList subtopicId={subtopicId} readOnly />;
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

          {/* Right: stats + dropdown + save + edit */}
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

            {/* Stats panel trigger */}
            {subtopic && (
              <StatsPanel
                topicId={topicId}
                subtopicId={subtopicId}
                subtopic={subtopic}
                onRecordRevision={() => recordRevision(topicId, subtopicId)}
                onUpdatePerformance={(data) => updatePerformance(topicId, subtopicId, data)}
                onUpdateMastery={(level) => updateMastery(topicId, subtopicId, level)}
                onUpdateConfidence={(level) => updateConfidence(topicId, subtopicId, level)}
              />
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
            <div className="h-full flex gap-4">
              <div className={`h-full ${contentIndicators.length > 0 ? "flex-1 min-w-0" : "w-full"}`}>
                {viewContent()}
              </div>
              {contentIndicators.length > 0 && (
                <div className="w-14 shrink-0 flex flex-col gap-2 pt-1">
                  {contentIndicators.map((ind) => (
                    <button
                      key={ind.tab}
                      onClick={() => setActiveTab(ind.tab)}
                      className="group relative flex flex-col items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-2 hover:bg-accent hover:border-border transition-colors"
                      title={ind.detail}
                    >
                      {ind.icon}
                      <span className="text-[9px] font-medium text-muted-foreground group-hover:text-foreground leading-tight">
                        {ind.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {initialised && (
            <div className={mode === "edit" && activeTab === "notes" ? "h-full" : "hidden"}>
              <RichTextEditor
                content={notesHtml}
                onChange={setNotesHtml}
                placeholder="Write your study notes here..."
              />
            </div>
          )}

          {mode === "edit" && activeTab === "sketchboard" && initialised && (
            <div className="h-full">
              <SketchBoard
                initialData={sketchDataUrl}
                onChange={setSketchDataUrl}
              />
            </div>
          )}
          {mode === "edit" && activeTab === "whiteboard" && initialised && (
            <div className="h-full">
              <Whiteboard
                initialData={whiteboardDataUrl}
                onChange={setWhiteboardDataUrl}
              />
            </div>
          )}
          {mode === "edit" && activeTab === "files" && (
            <div className="h-full">
              <FileManager />
            </div>
          )}
          {activeTab === "questions" && mode === "edit" && (
            <div className="h-full overflow-y-auto">
              <QuestionList subtopicId={subtopicId} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Stats Panel (Sheet) ──

interface StatsPanelProps {
  topicId: string;
  subtopicId: string;
  subtopic: {
    revision_count: number;
    last_revised_at: string | null;
    mastery_level: MasteryLevel;
    confidence_level: number;
    questions_solved: number;
    questions_correct: number;
    mistake_count: number;
  };
  onRecordRevision: () => Promise<void>;
  onUpdatePerformance: (data: {
    questions_correct: number;
    mistake_count: number;
  }) => Promise<void>;
  onUpdateMastery: (level: MasteryLevel) => Promise<void>;
  onUpdateConfidence: (level: number) => Promise<void>;
}

function StatsPanel({
  subtopic,
  onRecordRevision,
  onUpdatePerformance,
  onUpdateMastery,
  onUpdateConfidence,
}: StatsPanelProps) {
  const [saving, setSaving] = useState<string | null>(null);

  // Local form state for performance fields
  const [correct, setCorrect] = useState(subtopic.questions_correct);
  const [mistakes, setMistakes] = useState(subtopic.mistake_count);
  const solved = correct + mistakes;
  const [confidence, setConfidence] = useState(
    Math.round(subtopic.confidence_level * 100)
  );

  // Sync local state when subtopic changes (e.g. after save)
  useEffect(() => {
    setCorrect(subtopic.questions_correct);
    setMistakes(subtopic.mistake_count);
    setConfidence(Math.round(subtopic.confidence_level * 100));
  }, [subtopic.questions_correct, subtopic.mistake_count, subtopic.confidence_level]);

  const handleRevision = async () => {
    setSaving("revision");
    try {
      await onRecordRevision();
    } finally {
      setSaving(null);
    }
  };

  const handleMasteryChange = async (value: string | null) => {
    if (!value) return;
    setSaving("mastery");
    try {
      await onUpdateMastery(value as MasteryLevel);
    } finally {
      setSaving(null);
    }
  };

  const handlePerformanceSave = async () => {
    setSaving("performance");
    try {
      await onUpdatePerformance({
        questions_correct: correct,
        mistake_count: mistakes,
      });
    } finally {
      setSaving(null);
    }
  };

  const handleConfidenceSave = async () => {
    setSaving("confidence");
    try {
      await onUpdateConfidence(Math.min(100, Math.max(0, confidence)) / 100);
    } finally {
      setSaving(null);
    }
  };

  const perfDirty =
    correct !== subtopic.questions_correct ||
    mistakes !== subtopic.mistake_count;

  const confDirty =
    confidence !== Math.round(subtopic.confidence_level * 100);

  const accuracy =
    solved > 0 ? Math.round((correct / solved) * 100) : 0;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Stats</span>
          </Button>
        }
      />
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Subtopic Stats</SheetTitle>
          <SheetDescription>
            Track your progress, revisions, and performance.
          </SheetDescription>
        </SheetHeader>

        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-5">
          {/* Mastery Level */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Mastery Level</Label>
            <div className="flex flex-wrap gap-1.5">
              {masteryOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleMasteryChange(opt.value)}
                  disabled={saving === "mastery"}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                    subtopic.mastery_level === opt.value
                      ? `${opt.className} border-current ring-1 ring-current/20`
                      : "border-border text-muted-foreground hover:border-foreground/20"
                  } disabled:opacity-50`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Revision */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Revisions</Label>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-2xl font-bold">{subtopic.revision_count}</div>
                <div className="text-xs text-muted-foreground">
                  {subtopic.last_revised_at
                    ? `Last: ${new Date(subtopic.last_revised_at).toLocaleDateString()}`
                    : "Never revised"}
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleRevision}
                disabled={saving === "revision"}
                className="gap-1.5"
              >
                {saving === "revision" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Revise
              </Button>
            </div>
          </div>

          {/* Confidence */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Confidence</Label>
            <div className="flex items-center gap-3">
              <Progress value={confidence} className="h-2 flex-1" />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="h-8 w-16 text-xs text-center"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            {confDirty && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={handleConfidenceSave}
                disabled={saving === "confidence"}
              >
                {saving === "confidence" && (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                )}
                Save Confidence
              </Button>
            )}
          </div>

          {/* Performance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Performance</Label>
              {accuracy > 0 && (
                <span className="text-xs text-muted-foreground">
                  Accuracy: {accuracy}%
                </span>
              )}
            </div>

            <StatCounter label="Correct Answers" value={correct} onChange={setCorrect} />
            <StatCounter label="Mistakes" value={mistakes} onChange={setMistakes} />
            <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2 text-muted-foreground">
              <span className="text-sm">Total Solved</span>
              <span className="text-sm font-medium tabular-nums">{solved}</span>
            </div>

            {perfDirty && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={handlePerformanceSave}
                disabled={saving === "performance"}
              >
                {saving === "performance" && (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                )}
                Save Performance
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatCounter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-6 w-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-8 text-center text-sm font-medium tabular-nums">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="h-6 w-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
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
