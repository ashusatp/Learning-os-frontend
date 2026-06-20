"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  PenTool,
  Pencil,
  FolderOpen,
  RotateCcw,
  PencilLine,
  Eye,
  Save,
  Loader2,
  BarChart3,
  HelpCircle,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Header, BreadcrumbEntry } from "@/components/header";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Whiteboard } from "@/components/whiteboard";
import { SketchBoard } from "@/components/sketchboard";
import { FileManager } from "@/components/file-manager";
import { SubtopicNotesViewer } from "@/components/subtopic-notes-viewer";
import { QuestionList } from "@/components/question-list";
import { MistakeList } from "@/components/mistake-list";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/stores/auth-store";
import { useGoalStore } from "@/stores/goal-store";
import { useSubjectStore } from "@/stores/subject-store";
import { useTopicStore } from "@/stores/topic-store";
import { useSubTopicStore } from "@/stores/subtopic-store";
import { useQuestionStore } from "@/stores/question-store";
import { useMistakeStore } from "@/stores/mistake-store";
import api from "@/lib/api";
import { MasteryLevel } from "@/types";

type Mode = "view" | "edit";
type Tab = "notes" | "sketchboard" | "whiteboard" | "files" | "questions" | "mistakes";

const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

const tabsDef: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "notes", label: "Notes", icon: <FileText className="h-4 w-4" /> },
  { id: "sketchboard", label: "Sketch", icon: <Pencil className="h-4 w-4" /> },
  { id: "whiteboard", label: "Whiteboard", icon: <PenTool className="h-4 w-4" /> },
  { id: "files", label: "Files", icon: <FolderOpen className="h-4 w-4" /> },
  { id: "questions", label: "Questions", icon: <HelpCircle className="h-4 w-4" /> },
  { id: "mistakes", label: "Mistakes", icon: <AlertTriangle className="h-4 w-4" /> },
];

const masteryOptions: { value: MasteryLevel; label: string; className: string }[] = [
  { value: "NOT_STARTED", label: "Not Started", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300" },
  { value: "BEGINNER", label: "Beginner", className: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" },
  { value: "INTERMEDIATE", label: "Intermediate", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  { value: "ADVANCED", label: "Advanced", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" },
  { value: "MASTERED", label: "Mastered", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
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
  } = useSubTopicStore();
  const { questions, fetchQuestions, total: questionTotal } = useQuestionStore();
  const { mistakes, fetchMistakes, total: mistakeTotal } = useMistakeStore();

  const [mode, setMode] = useState<Mode>("view");
  const [activeTab, setActiveTab] = useState<Tab>("notes");
  const [fullscreen, setFullscreen] = useState<"notes" | "sketch" | null>(null);

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
    fetchQuestions(subtopicId, 1);
    fetchMistakes(subtopicId, null, 1);
  }, [subtopicId, fetchQuestions, fetchMistakes]);

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
  const questionCount = questionTotal;
  const mistakeCount = mistakeTotal;
  const fileCount = subtopic?.files?.length ?? 0;

  // Content availability flags for badge dots
  const tabHasContent: Partial<Record<Tab, boolean>> = {
    notes: !!notesHtml && notesHtml !== "<p></p>",
    sketchboard: hasSketch,
    whiteboard: hasWhiteboard,
    questions: questionCount > 0,
    mistakes: mistakeTotal > 0,
    files: hasFiles,
  };

  const viewContent = () => {
    switch (activeTab) {
      case "notes":
        return (
          <div className="h-full relative">
            <SubtopicNotesViewer
              notesHtml={notesHtml}
              sketchDataUrl={undefined}
              whiteboardDataUrl={undefined}
            />
            <FullscreenButton onClick={() => setFullscreen("notes")} />
          </div>
        );
      case "sketchboard":
        return sketchDataUrl ? (
          <div className="h-full">
            <SketchBoard initialData={sketchDataUrl} readOnly onFullscreen={() => setFullscreen("sketch")} />
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
        return (
          <div className="h-full">
            <FileManager topicId={topicId} subtopicId={subtopicId} readOnly />
          </div>
        );
      case "questions":
        return <QuestionList subtopicId={subtopicId} readOnly />;
      case "mistakes":
        return <MistakeList subtopicId={subtopicId} readOnly questions={questions} />;
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
            {mastery && subtopic && (
              <Select
                value={subtopic.mastery_level}
                onValueChange={(v) => {
                  if (v) {
                    api.patch(`/topics/${topicId}/subtopics/${subtopicId}/stats`, {
                      mastery_level: v,
                    }).then(() => fetchSubTopics(topicId));
                  }
                }}
              >
                <SelectTrigger className={`h-7 w-[130px] text-xs font-medium rounded-md ${mastery.className}`}>
                  <span>{mastery.label}</span>
                </SelectTrigger>
                <SelectContent>
                  {masteryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 ${opt.className}`}
                      >
                        {opt.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <HelpCircle className="h-3 w-3" />
                  {questionTotal} Qs
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  {mistakeTotal} mistakes
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
              />
            )}

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
              <div className="h-full flex-1 min-w-0">
                {viewContent()}
              </div>
              <SideTabNav
                tabs={tabsDef}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabHasContent={tabHasContent}
              />
            </div>
          )}

          {mode === "edit" && (
            <div className="h-full flex gap-4">
              <div className="h-full flex-1 min-w-0">
                {initialised && (
                  <div className={activeTab === "notes" ? "h-full relative" : "hidden"}>
                    <RichTextEditor
                      content={notesHtml}
                      onChange={setNotesHtml}
                      placeholder="Write your study notes here..."
                      aiEnabled={true}
                      aiHierarchy={{
                        goal: activeGoal?.title,
                        subject: activeSubject?.name,
                        topic: activeTopic?.name,
                        subtopic: subtopic?.name,
                      }}
                    />
                    <FullscreenButton onClick={() => setFullscreen("notes")} />
                  </div>
                )}

                {activeTab === "sketchboard" && initialised && fullscreen !== "sketch" && (
                  <div className="h-full">
                    <SketchBoard
                      initialData={sketchDataUrl}
                      onChange={setSketchDataUrl}
                      onFullscreen={() => setFullscreen("sketch")}
                    />
                  </div>
                )}
                {activeTab === "whiteboard" && initialised && (
                  <div className="h-full">
                    <Whiteboard
                      initialData={whiteboardDataUrl}
                      onChange={setWhiteboardDataUrl}
                    />
                  </div>
                )}
                {activeTab === "files" && (
                  <div className="h-full">
                    <FileManager topicId={topicId} subtopicId={subtopicId} />
                  </div>
                )}
                {activeTab === "questions" && (
                  <div className="h-full overflow-y-auto">
                    <QuestionList subtopicId={subtopicId} />
                  </div>
                )}
                {activeTab === "mistakes" && (
                  <div className="h-full overflow-y-auto">
                    <MistakeList subtopicId={subtopicId} questions={questions} />
                  </div>
                )}
              </div>
              <SideTabNav
                tabs={tabsDef}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabHasContent={tabHasContent}
              />
            </div>
          )}
        </div>
      </main>

      {/* Fullscreen overlays */}
      {fullscreen === "notes" && (
        <FullscreenOverlay title="Notes" onClose={() => setFullscreen(null)}>
          {mode === "edit" ? (
            <RichTextEditor
              content={notesHtml}
              onChange={setNotesHtml}
              placeholder="Write your study notes here..."
              aiEnabled={true}
              aiHierarchy={{
                goal: activeGoal?.title,
                subject: activeSubject?.name,
                topic: activeTopic?.name,
                subtopic: subtopic?.name,
              }}
            />
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <SubtopicNotesViewer
                notesHtml={notesHtml}
                sketchDataUrl={undefined}
                whiteboardDataUrl={undefined}
              />
            </div>
          )}
        </FullscreenOverlay>
      )}

      {fullscreen === "sketch" && (
        <FullscreenOverlay
          title="Sketchboard"
          onClose={() => setFullscreen(null)}
          onSave={mode === "edit" ? handleSave : undefined}
          saving={isSaving}
          dirty={isDirty}
        >
          {mode === "edit" ? (
            <SketchBoard
              initialData={sketchDataUrl}
              onChange={setSketchDataUrl}
            />
          ) : (
            <SketchBoard initialData={sketchDataUrl} readOnly />
          )}
        </FullscreenOverlay>
      )}
    </div>
  );
}

// ── Stats Panel (Sheet) ──

interface StatsPanelProps {
  topicId: string;
  subtopicId: string;
}

function StatsPanel({ topicId, subtopicId }: StatsPanelProps) {
  const [stats, setStats] = useState<import("@/types").SubtopicStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await api.get(`/topics/${topicId}/subtopics/${subtopicId}/stats`);
      setStats(res.data);
      setConfidence(Math.round(res.data.confidence_level * 100));
    } catch {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  }, [topicId, subtopicId]);

  useEffect(() => {
    if (sheetOpen) fetchStats();
  }, [sheetOpen, fetchStats]);

  const handleRevision = async () => {
    setSaving("revision");
    try {
      const res = await api.post(`/topics/${topicId}/subtopics/${subtopicId}/stats/revise`);
      setStats(res.data);
    } finally {
      setSaving(null);
    }
  };

  const handleConfidenceSave = async () => {
    setSaving("confidence");
    try {
      const res = await api.patch(`/topics/${topicId}/subtopics/${subtopicId}/stats`, {
        confidence_level: Math.min(100, Math.max(0, confidence)) / 100,
      });
      setStats(res.data);
    } finally {
      setSaving(null);
    }
  };

  const confDirty = stats ? confidence !== Math.round(stats.confidence_level * 100) : false;

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
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

        {loadingStats || !stats ? (
          <div className="px-4 pb-4 space-y-5">
            {/* Revision skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-7 w-10" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-9 w-20 rounded-md" />
              </div>
            </div>
            {/* Confidence skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </div>
            {/* Performance skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-1.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-10" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-5">
            {/* Revision */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Revisions</Label>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-2xl font-bold">{stats.revision_count}</div>
                  <div className="text-xs text-muted-foreground">
                    {stats.last_revised_at
                      ? `Last: ${new Date(stats.last_revised_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
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

            {/* Content */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Content</Label>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm">Questions</span>
                <span className="text-sm font-medium tabular-nums">{stats.question_count}</span>
              </div>
            </div>

            {/* Mistakes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Mistakes</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xl font-bold">{stats.total_mistakes}</div>
                  <div className="text-[10px] text-muted-foreground">Total</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xl font-bold text-red-500">{stats.unresolved_mistakes}</div>
                  <div className="text-[10px] text-muted-foreground">Unresolved</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xl font-bold text-green-500">{stats.resolved_mistakes}</div>
                  <div className="text-[10px] text-muted-foreground">Resolved</div>
                </div>
              </div>
              {stats.total_mistakes > 0 && (
                <div className="flex items-center gap-2">
                  <Progress
                    value={Math.round((stats.resolved_mistakes / stats.total_mistakes) * 100)}
                    className="h-1.5 flex-1"
                  />
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {Math.round((stats.resolved_mistakes / stats.total_mistakes) * 100)}% resolved
                  </span>
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Timeline</Label>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Created</span>
                  <span className="tabular-nums">{new Date(stats.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Last updated</span>
                  <span className="tabular-nums">{new Date(stats.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
                {stats.last_revised_at && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Last revised</span>
                    <span className="tabular-nums">{new Date(stats.last_revised_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
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

// ── Fullscreen helpers ──

function FullscreenOverlay({
  title,
  onClose,
  onSave,
  saving,
  dirty,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saving?: boolean;
  dirty?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <span className="text-sm font-medium">{title}</span>
        <div className="flex items-center gap-1.5">
          {onSave && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              disabled={!dirty || saving}
              className="gap-1.5 text-xs"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-xs">
            <Minimize2 className="h-3.5 w-3.5" />
            Exit fullscreen
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

function FullscreenButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-2 right-2 z-10 p-1.5 rounded-md border border-border/60 bg-background/80 backdrop-blur text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      title="Fullscreen"
    >
      <Maximize2 className="h-3.5 w-3.5" />
    </button>
  );
}

// ── Side Tab Navigator ──

function SideTabNav({
  tabs,
  activeTab,
  onTabChange,
  tabHasContent,
}: {
  tabs: { id: Tab; label: string; icon: React.ReactNode }[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  tabHasContent: Partial<Record<Tab, boolean>>;
}) {
  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <div className="w-16 shrink-0 flex flex-col items-center relative">
      {/* Track background */}
      <div className="relative flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
        {/* Sliding indicator */}
        <div
          className="absolute left-1 right-1 rounded-lg bg-background shadow-sm border border-border/80 transition-all duration-200 ease-out"
          style={{
            height: `${56}px`,
            top: `${4 + activeIndex * (56 + 4)}px`,
          }}
        />

        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const hasContent = tabHasContent[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative z-10 flex flex-col items-center justify-center gap-1 w-[52px] h-[56px] rounded-lg transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              }`}
              title={tab.label}
            >
              <div className="relative">
                {tab.icon}
                {hasContent && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[9px] font-medium leading-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
