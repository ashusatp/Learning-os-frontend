"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Filter,
  RotateCcw,
} from "lucide-react";
import { Header, BreadcrumbEntry } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { AuthGuard } from "@/components/auth-guard";
import { CreateQuestionDialog } from "@/components/create-question-dialog";
import { useGoalStore } from "@/stores/goal-store";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionStore } from "@/stores/question-store";
import { GoalQuestion, QuestionType, DifficultyLevel, Subject, Topic } from "@/types";
import api from "@/lib/api";

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_MCQ: "MCQ",
  MULTI_MCQ: "Multi MCQ",
  NUMERICAL: "Numerical",
  TRUE_FALSE: "True/False",
  SUBJECTIVE: "Subjective",
};

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  EASY: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-amber-500/20 dark:text-amber-300",
  HARD: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

export default function QuestionsPage() {
  return (
    <AuthGuard>
      <QuestionsContent />
    </AuthGuard>
  );
}

function QuestionsContent() {
  const params = useParams<{ goalId: string }>();
  const goalId = params.goalId;

  const { user } = useAuthStore();
  const { activeGoal, goals, setActiveGoal, fetchGoals } = useGoalStore();
  const {
    goalQuestions,
    loading,
    error,
    page,
    total,
    totalPages,
    fetchQuestionsByGoal,
  } = useQuestionStore();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Filters
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [filterTopic, setFilterTopic] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("");
  const [filterPyq, setFilterPyq] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (user && goals.length === 0) fetchGoals(user.id);
  }, [user, goals.length, fetchGoals]);

  useEffect(() => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) setActiveGoal(goal);
  }, [goals, goalId, setActiveGoal]);

  // Load subjects
  useEffect(() => {
    if (goalId) {
      api.get(`/goals/${goalId}/subjects`).then((res) => setSubjects(res.data)).catch(() => {});
    }
  }, [goalId]);

  // Load topics when subject filter changes
  useEffect(() => {
    if (filterSubject) {
      api.get(`/subjects/${filterSubject}/topics`).then((res) => setTopics(res.data)).catch(() => {});
    } else {
      setTopics([]);
      setFilterTopic("");
    }
  }, [filterSubject]);

  const buildFilters = useCallback(() => {
    const filters: Record<string, string | boolean> = {};
    if (filterSubject) filters.subject_id = filterSubject;
    if (filterTopic) filters.topic_id = filterTopic;
    if (filterType) filters.question_type = filterType;
    if (filterDifficulty) filters.difficulty = filterDifficulty;
    if (filterPyq === "true") filters.is_pyq = true;
    if (filterPyq === "false") filters.is_pyq = false;
    return filters;
  }, [filterSubject, filterTopic, filterType, filterDifficulty, filterPyq]);

  useEffect(() => {
    if (goalId) {
      fetchQuestionsByGoal(goalId, 1, 10, buildFilters());
    }
  }, [goalId, fetchQuestionsByGoal, buildFilters]);

  const goToPage = useCallback(
    (p: number) => {
      fetchQuestionsByGoal(goalId, p, 10, buildFilters());
      setExpandedId(null);
    },
    [goalId, fetchQuestionsByGoal, buildFilters]
  );

  const resetFilters = () => {
    setFilterSubject("");
    setFilterTopic("");
    setFilterType("");
    setFilterDifficulty("");
    setFilterPyq("");
  };

  const hasActiveFilters = filterSubject || filterTopic || filterType || filterDifficulty || filterPyq;

  const breadcrumbs: BreadcrumbEntry[] = [
    { label: activeGoal?.title || "Goal", href: `/goals/${goalId}` },
    { label: "Questions" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header breadcrumbs={breadcrumbs} />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-blue-500" />
              Questions
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse all questions across {activeGoal?.title || "this goal"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1.5 text-xs"
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                  {[filterSubject, filterTopic, filterType, filterDifficulty, filterPyq].filter(Boolean).length}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setCreateOpen(true)}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Create Question
            </Button>
            <Link href={`/goals/${goalId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to Goal
              </Button>
            </Link>
            <CreateQuestionDialog
              goalId={goalId}
              goalTitle={activeGoal?.title}
              open={createOpen}
              onOpenChange={setCreateOpen}
              onCreated={() => fetchQuestionsByGoal(goalId, 1, 10, buildFilters())}
              hideTrigger
            />
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="mb-6 rounded-lg border bg-card p-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filter Questions</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="xs" onClick={resetFilters} className="gap-1 text-xs text-muted-foreground">
                  <RotateCcw className="h-3 w-3" />
                  Clear all
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Subject</label>
                <Select value={filterSubject} onValueChange={(v) => { setFilterSubject(!v || v === "__all__" ? "" : v); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <span className="truncate">{subjects.find((s) => s.id === filterSubject)?.name || "All subjects"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All subjects</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Topic</label>
                <Select value={filterTopic} onValueChange={(v) => setFilterTopic(!v || v === "__all__" ? "" : v)} disabled={!filterSubject}>
                  <SelectTrigger className="h-8 text-xs">
                    <span className="truncate">{topics.find((t) => t.id === filterTopic)?.name || "All topics"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All topics</SelectItem>
                    {topics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Type</label>
                <Select value={filterType} onValueChange={(v) => setFilterType(!v || v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <span className="truncate">{filterType ? TYPE_LABELS[filterType as QuestionType] : "All types"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All types</SelectItem>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Difficulty</label>
                <Select value={filterDifficulty} onValueChange={(v) => setFilterDifficulty(!v || v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <span className="truncate">{filterDifficulty || "All levels"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All levels</SelectItem>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">PYQ</label>
                <Select value={filterPyq} onValueChange={(v) => setFilterPyq(!v || v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <span className="truncate">{filterPyq === "true" ? "PYQ only" : filterPyq === "false" ? "Non-PYQ" : "All"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    <SelectItem value="true">PYQ only</SelectItem>
                    <SelectItem value="false">Non-PYQ only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Stats bar */}
        {!loading && (
          <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground animate-fade-in-up">
            <span className="font-medium text-foreground">{total}</span> question{total !== 1 ? "s" : ""} found
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card px-4 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && goalQuestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <HelpCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No questions found</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {hasActiveFilters
                ? "Try adjusting your filters to find more questions."
                : "Start adding questions from the goal page or within subtopics."}
            </p>
          </div>
        )}

        {/* Question cards */}
        {!loading && goalQuestions.length > 0 && (
          <div className="space-y-3 animate-fade-in-up">
            {goalQuestions.map((q, idx) => (
              <GoalQuestionCard
                key={q.id}
                question={q}
                index={(page - 1) * 10 + idx}
                expanded={expandedId === q.id}
                onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
                goalId={goalId}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="xs" onClick={() => goToPage(page - 1)} disabled={page <= 1} className="gap-1">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p: number;
                if (totalPages <= 7) p = i + 1;
                else if (page <= 4) p = i + 1;
                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                else p = page - 3 + i;
                return (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="xs"
                    onClick={() => goToPage(p)}
                    className="w-7 h-7 p-0 text-xs"
                  >
                    {p}
                  </Button>
                );
              })}
              <Button variant="outline" size="xs" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="gap-1">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Question Card with location context ──

function GoalQuestionCard({
  question: q,
  index,
  expanded,
  onToggle,
  goalId,
}: {
  question: GoalQuestion;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  goalId: string;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (!expanded) {
      setShowAnswer(false);
      setShowExplanation(false);
    }
  }, [expanded]);

  const hasAnswer =
    q.options.length > 0 ||
    (q.question_type === "NUMERICAL" && q.numerical_answer !== null) ||
    (q.question_type === "SUBJECTIVE" && q.answer_html);
  const hasExplanation = !!q.explanation_html;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        <span className="text-sm font-semibold shrink-0">Q{index + 1}</span>

        {/* Location breadcrumb */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0 overflow-hidden">
          <span className="truncate">{q.subject_name}</span>
          <ChevronRight className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{q.topic_name}</span>
          {q.subtopic_name && q.subtopic_name !== "Miscellaneous" && (
            <>
              <ChevronRight className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate text-foreground/70">{q.subtopic_name}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {TYPE_LABELS[q.question_type]}
          </Badge>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${DIFFICULTY_STYLES[q.difficulty]}`}>
            {q.difficulty}
          </Badge>
          {q.is_pyq && (
            <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-300 dark:border-purple-500/30" variant="outline">
              PYQ
            </Badge>
          )}
          {q.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
          ))}
          <span className="text-[10px] text-muted-foreground">
            {q.marks > 0 && `+${q.marks}`}
            {q.negative_marks > 0 && ` / -${q.negative_marks}`}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: q.text_html }} />

          {q.options.length > 0 && (
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <div
                  key={opt.id}
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                    showAnswer && opt.is_correct ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/50" : ""
                  }`}
                >
                  <span className={`shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                    showAnswer && opt.is_correct ? "border-green-500 bg-green-500 text-white" : "border-border text-muted-foreground"
                  }`}>
                    {showAnswer && opt.is_correct ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + i)}
                  </span>
                  <div className="prose prose-sm dark:prose-invert max-w-none flex-1" dangerouslySetInnerHTML={{ __html: opt.text_html }} />
                </div>
              ))}
            </div>
          )}

          {showAnswer && q.question_type === "NUMERICAL" && q.numerical_answer !== null && (
            <div className="rounded-lg border border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/50 px-3 py-2">
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                Answer: {q.numerical_answer}{q.numerical_tolerance ? ` (± ${q.numerical_tolerance})` : ""}
              </span>
            </div>
          )}

          {showAnswer && q.question_type === "SUBJECTIVE" && q.answer_html && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Model Answer</span>
              <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border p-3" dangerouslySetInnerHTML={{ __html: q.answer_html }} />
            </div>
          )}

          {showExplanation && q.explanation_html && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Explanation</span>
              <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-dashed p-3 bg-muted/30" dangerouslySetInnerHTML={{ __html: q.explanation_html }} />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t">
            {hasAnswer && (
              <Button variant={showAnswer ? "secondary" : "outline"} size="xs" onClick={() => setShowAnswer(!showAnswer)} className="gap-1 text-xs">
                {showAnswer ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                {showAnswer ? "Hide Answer" : "Show Answer"}
              </Button>
            )}
            {hasExplanation && (
              <Button variant={showExplanation ? "secondary" : "outline"} size="xs" onClick={() => setShowExplanation(!showExplanation)} className="gap-1 text-xs">
                {showExplanation ? <X className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {showExplanation ? "Hide Explanation" : "Show Explanation"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
