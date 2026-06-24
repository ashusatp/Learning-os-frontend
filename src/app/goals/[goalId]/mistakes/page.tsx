"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  LinkIcon,
  Eye,
  EyeOff,
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
import { LogMistakeDialog } from "@/components/log-mistake-dialog";
import { useGoalStore } from "@/stores/goal-store";
import { useAuthStore } from "@/stores/auth-store";
import { useMistakeStore } from "@/stores/mistake-store";
import { GoalMistake, MistakeType, Subject, Topic } from "@/types";
import api from "@/lib/api";

const TYPE_LABELS: Record<MistakeType, string> = {
  CONCEPTUAL: "Conceptual",
  SILLY: "Silly",
  CALCULATION: "Calculation",
  MISREAD: "Misread",
  TIME_PRESSURE: "Time Pressure",
  OTHER: "Other",
};

const TYPE_STYLES: Record<MistakeType, string> = {
  CONCEPTUAL: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  SILLY: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  CALCULATION: "bg-yellow-100 text-yellow-700 dark:bg-amber-500/20 dark:text-amber-300",
  MISREAD: "bg-blue-100 text-blue-700 dark:bg-sky-500/20 dark:text-sky-300",
  TIME_PRESSURE: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  OTHER: "bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300",
};

export default function MistakesPage() {
  return (
    <AuthGuard>
      <MistakesContent />
    </AuthGuard>
  );
}

function MistakesContent() {
  const params = useParams<{ goalId: string }>();
  const goalId = params.goalId;

  const { user } = useAuthStore();
  const { activeGoal, goals, setActiveGoal, fetchGoals } = useGoalStore();
  const {
    goalMistakes,
    loading,
    error,
    page,
    total,
    totalPages,
    fetchMistakesByGoalPaginated,
  } = useMistakeStore();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Filters
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [filterTopic, setFilterTopic] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterResolved, setFilterResolved] = useState<string>("");
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

  useEffect(() => {
    if (goalId) {
      api.get(`/goals/${goalId}/subjects`).then((res) => setSubjects(res.data)).catch(() => {});
    }
  }, [goalId]);

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
    if (filterType) filters.mistake_type = filterType;
    if (filterResolved === "true") filters.resolved = true;
    if (filterResolved === "false") filters.resolved = false;
    return filters;
  }, [filterSubject, filterTopic, filterType, filterResolved]);

  useEffect(() => {
    if (goalId) {
      fetchMistakesByGoalPaginated(goalId, 1, 10, buildFilters());
    }
  }, [goalId, fetchMistakesByGoalPaginated, buildFilters]);

  const goToPage = useCallback(
    (p: number) => {
      fetchMistakesByGoalPaginated(goalId, p, 10, buildFilters());
      setExpandedId(null);
    },
    [goalId, fetchMistakesByGoalPaginated, buildFilters]
  );

  const resetFilters = () => {
    setFilterSubject("");
    setFilterTopic("");
    setFilterType("");
    setFilterResolved("");
  };

  const hasActiveFilters = filterSubject || filterTopic || filterType || filterResolved;

  const breadcrumbs: BreadcrumbEntry[] = [
    { label: activeGoal?.title || "Goal", href: `/goals/${goalId}` },
    { label: "Mistakes" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header breadcrumbs={breadcrumbs} />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Mistakes
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review all mistakes across {activeGoal?.title || "this goal"}
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
                  {[filterSubject, filterTopic, filterType, filterResolved].filter(Boolean).length}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setCreateOpen(true)}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Log Mistake
            </Button>
            <Link href={`/goals/${goalId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to Goal
              </Button>
            </Link>
            <LogMistakeDialog
              goalId={goalId}
              goalTitle={activeGoal?.title}
              open={createOpen}
              onOpenChange={setCreateOpen}
              onLogged={() => fetchMistakesByGoalPaginated(goalId, 1, 10, buildFilters())}
              hideTrigger
            />
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="mb-6 rounded-lg border bg-card p-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filter Mistakes</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="xs" onClick={resetFilters} className="gap-1 text-xs text-muted-foreground">
                  <RotateCcw className="h-3 w-3" />
                  Clear all
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Subject</label>
                <Select value={filterSubject} onValueChange={(v) => setFilterSubject(!v || v === "__all__" ? "" : v)}>
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
                    <span className="truncate">{filterType ? TYPE_LABELS[filterType as MistakeType] : "All types"}</span>
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
                <label className="text-[11px] text-muted-foreground">Status</label>
                <Select value={filterResolved} onValueChange={(v) => setFilterResolved(!v || v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <span className="truncate">
                      {filterResolved === "true" ? "Resolved" : filterResolved === "false" ? "Unresolved" : "All"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    <SelectItem value="false">Unresolved</SelectItem>
                    <SelectItem value="true">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Stats bar */}
        {!loading && (
          <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground animate-fade-in-up">
            <span className="font-medium text-foreground">{total}</span> mistake{total !== 1 ? "s" : ""} found
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card px-4 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-20 ml-auto rounded-full" />
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
        {!loading && !error && goalMistakes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No mistakes found</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {hasActiveFilters
                ? "Try adjusting your filters to find more mistakes."
                : "Start logging mistakes from the goal page to track your weak areas."}
            </p>
          </div>
        )}

        {/* Mistake cards */}
        {!loading && goalMistakes.length > 0 && (
          <div className="space-y-3 animate-fade-in-up">
            {goalMistakes.map((m) => (
              <GoalMistakeCard
                key={m.id}
                mistake={m}
                expanded={expandedId === m.id}
                onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
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

// ── Mistake Card with location context ──

function GoalMistakeCard({
  mistake: m,
  expanded,
  onToggle,
}: {
  mistake: GoalMistake;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [showCorrection, setShowCorrection] = useState(false);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        {m.is_resolved ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-red-400 shrink-0" />
        )}

        <span
          className="flex-1 text-sm truncate"
          dangerouslySetInnerHTML={{
            __html: m.description_html.replace(/<[^>]+>/g, "").slice(0, 100) || "Untitled mistake",
          }}
        />

        {/* Location breadcrumb */}
        <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
          <span className="truncate max-w-[100px]">{m.subject_name}</span>
          <ChevronRight className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate max-w-[100px]">{m.topic_name}</span>
          {m.subtopic_name && m.subtopic_name !== "Miscellaneous" && (
            <>
              <ChevronRight className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate max-w-[100px] text-foreground/70">{m.subtopic_name}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_STYLES[m.mistake_type]}`}>
            {TYPE_LABELS[m.mistake_type]}
          </Badge>
          {m.question_id && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
              <LinkIcon className="h-2.5 w-2.5" /> Q
            </Badge>
          )}
          {m.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
          ))}
          <span className="text-[10px] text-muted-foreground">
            {new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Location on mobile */}
          <div className="md:hidden flex items-center gap-1 text-[11px] text-muted-foreground">
            <span>{m.subject_name}</span>
            <ChevronRight className="h-2.5 w-2.5" />
            <span>{m.topic_name}</span>
            {m.subtopic_name && m.subtopic_name !== "Miscellaneous" && (
              <>
                <ChevronRight className="h-2.5 w-2.5" />
                <span className="text-foreground/70">{m.subtopic_name}</span>
              </>
            )}
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">What went wrong</span>
            <div className="prose prose-sm dark:prose-invert max-w-none mt-1" dangerouslySetInnerHTML={{ __html: m.description_html }} />
          </div>

          {m.correction_html && showCorrection && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">Correct approach</span>
              <div
                className="prose prose-sm dark:prose-invert max-w-none mt-1 rounded-lg border border-dashed p-3 bg-green-50/50 dark:bg-green-950/20"
                dangerouslySetInnerHTML={{ __html: m.correction_html }}
              />
            </div>
          )}

          {m.is_resolved && m.resolved_at && (
            <p className="text-[10px] text-green-600 dark:text-green-400">
              Resolved on {new Date(m.resolved_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}

          {m.revision_count > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Revised {m.revision_count} time{m.revision_count !== 1 ? "s" : ""}
              {m.last_revised_at && ` — last on ${new Date(m.last_revised_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
            </p>
          )}

          <div className="flex items-center gap-2 pt-2 border-t">
            {m.correction_html && (
              <Button
                variant={showCorrection ? "secondary" : "outline"}
                size="xs"
                onClick={() => setShowCorrection(!showCorrection)}
                className="gap-1 text-xs"
              >
                {showCorrection ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showCorrection ? "Hide Correction" : "Show Correction"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
