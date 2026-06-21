"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Flame,
  TrendingUp,
  ArrowUpCircle,
  ShieldAlert,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { AuthGuard } from "@/components/auth-guard";
import { RevisionCard } from "@/components/revision-card";
import { useRevisionStore } from "@/stores/revision-store";
import { useGoalStore } from "@/stores/goal-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { RevisionCalendar } from "@/components/revision-calendar";
import { PromotionSuggestion, QualityRating, RevisionQueueItem } from "@/types";
import { toast } from "sonner";

export default function GlobalRevisionsPage() {
  return (
    <AuthGuard>
      <GlobalRevisionsContent />
    </AuthGuard>
  );
}

function GlobalRevisionsContent() {
  const { user } = useAuthStore();
  const { goals, fetchGoals } = useGoalStore();
  const {
    overdue,
    dueToday,
    upcoming,
    stats,
    settings,
    loading,
    error,
    fetchGlobalQueue,
    fetchSettings,
    completeRevision,
    skipRevision,
    pauseRevision,
    promoteMastery,
  } = useRevisionStore();

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [promotionPending, setPromotionPending] = useState<PromotionSuggestion | null>(null);
  const [goalFilter, setGoalFilter] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchGoals(user.id);
      fetchGlobalQueue();
      fetchSettings();
    }
  }, [user, fetchGoals, fetchGlobalQueue, fetchSettings]);

  const filterItems = useCallback(
    (items: RevisionQueueItem[]) => {
      if (goalFilter === "all") return items;
      return items.filter((i) => i.goal_id === goalFilter);
    },
    [goalFilter]
  );

  const filteredOverdue = useMemo(() => filterItems(overdue), [filterItems, overdue]);
  const filteredDueToday = useMemo(() => filterItems(dueToday), [filterItems, dueToday]);
  const filteredUpcoming = useMemo(() => filterItems(upcoming), [filterItems, upcoming]);

  const handleComplete = useCallback(
    async (scheduleId: string, rating: QualityRating) => {
      setCompletingId(scheduleId);
      try {
        const result = await completeRevision(scheduleId, rating);

        if (result.penalty_applied && result.penalty_applied.mastery_dropped > 0) {
          toast.error(
            `Mastery decayed: ${result.penalty_applied.old_mastery} → ${result.penalty_applied.new_mastery} (${result.penalty_applied.days_overdue}d overdue)`
          );
        } else if (result.penalty_applied && result.penalty_applied.confidence_penalty > 0) {
          toast.warning(
            `Confidence reduced by ${result.penalty_applied.confidence_penalty}% (${result.penalty_applied.days_overdue}d overdue)`
          );
        }

        if (result.promotion_suggestion) {
          setPromotionPending(result.promotion_suggestion);
        }
      } finally {
        setCompletingId(null);
      }
    },
    [completeRevision]
  );

  const handleAcceptPromotion = useCallback(async () => {
    if (!promotionPending) return;
    try {
      await promoteMastery(promotionPending.subtopic_id, promotionPending.suggested_level);
      toast.success(
        `${promotionPending.subtopic_name} promoted to ${promotionPending.suggested_level}!`
      );
    } catch {
      toast.error("Failed to promote mastery");
    }
    setPromotionPending(null);
  }, [promotionPending, promoteMastery]);

  const handleDismissPromotion = useCallback(() => {
    setPromotionPending(null);
  }, []);

  const handleSkip = useCallback(
    async (scheduleId: string) => {
      await skipRevision(scheduleId);
    },
    [skipRevision]
  );

  const handlePause = useCallback(
    async (scheduleId: string) => {
      await pauseRevision(scheduleId);
    },
    [pauseRevision]
  );

  // Get unique goals from queue items for filter dropdown
  const goalOptions = useMemo(() => {
    const allItems = [...overdue, ...dueToday, ...upcoming];
    const seen = new Map<string, string>();
    for (const item of allItems) {
      if (item.goal_id && !seen.has(item.goal_id)) {
        seen.set(item.goal_id, item.goal_title);
      }
    }
    return Array.from(seen, ([id, title]) => ({ id, title }));
  }, [overdue, dueToday, upcoming]);

  const isEmpty =
    !loading &&
    !error &&
    filteredOverdue.length === 0 &&
    filteredDueToday.length === 0 &&
    filteredUpcoming.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Title + Filter */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Revisions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              All your scheduled revisions across goals
            </p>
          </div>

          {goalOptions.length > 1 && (
            <Select value={goalFilter} onValueChange={(v) => v && setGoalFilter(v)}>
              <SelectTrigger className="h-9 text-xs w-44">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3 w-3" />
                  <span className="truncate">
                    {goalFilter === "all"
                      ? "All Goals"
                      : goalOptions.find((g) => g.id === goalFilter)?.title || "Filter"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                {goalOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Two-column layout: queue left, calendar right */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column — stats + queue */}
          <div className="flex-1 min-w-0">
            {/* Stats bar */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard
                  icon={<Clock className="h-4 w-4 text-violet-500" />}
                  label="Due Today"
                  value={stats.due_today}
                />
                <StatCard
                  icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                  label="Overdue"
                  value={stats.overdue_count}
                  alert={stats.overdue_count > 0}
                />
                <StatCard
                  icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                  label="Done Today"
                  value={stats.completed_today}
                />
                <StatCard
                  icon={<Flame className="h-4 w-4 text-orange-500" />}
                  label="Streak"
                  value={`${stats.daily_streak}d`}
                />
              </div>
            )}

            {/* Daily progress */}
            {stats && stats.due_today > 0 && (
              <div className="mb-6 rounded-lg border bg-card px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Today&apos;s Progress</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {stats.completed_today} / {settings?.daily_limit || stats.due_today} done
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (stats.completed_today / (settings?.daily_limit || stats.due_today)) * 100
                  )}
                  className="h-2"
                />
              </div>
            )}

            {/* Promotion suggestion banner */}
            {promotionPending && (
              <div className="mb-6 rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <ArrowUpCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Promote {promotionPending.subtopic_name}?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {promotionPending.consecutive_successes} successful revisions in a row!
                      Promote from {promotionPending.current_level} to{" "}
                      {promotionPending.suggested_level}?
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={handleDismissPromotion}>
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAcceptPromotion}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Promote
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Welcome back catch-up banner */}
            {!loading && filteredOverdue.length > 5 && (
              <div className="mb-6 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Welcome back!</p>
                    <p className="text-xs text-muted-foreground">
                      You have {filteredOverdue.length} overdue items. Focus on the
                      highest-priority ones first — they&apos;re sorted by importance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border bg-card px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center justify-center py-16 text-destructive gap-2">
                <AlertTriangle className="h-5 w-5" />
                {error}
              </div>
            )}

            {/* Empty state */}
            {isEmpty && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  No revisions due. Start studying subtopics and they&apos;ll appear
                  here when it&apos;s time to review.
                </p>
              </div>
            )}

            {/* Queue sections */}
            {!loading && !error && !isEmpty && (
              <div className="space-y-6">
                {filteredOverdue.length > 0 && (
                  <QueueSection
                    title="Overdue"
                    icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                    count={filteredOverdue.length}
                    items={filteredOverdue}
                    completingId={completingId}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    onPause={handlePause}
                  />
                )}

                {filteredDueToday.length > 0 && (
                  <QueueSection
                    title="Due Today"
                    icon={<Clock className="h-4 w-4 text-violet-500" />}
                    count={filteredDueToday.length}
                    items={filteredDueToday}
                    completingId={completingId}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    onPause={handlePause}
                  />
                )}

                {filteredUpcoming.length > 0 && (
                  <QueueSection
                    title="Upcoming (next 3 days)"
                    icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                    count={filteredUpcoming.length}
                    items={filteredUpcoming}
                    completingId={completingId}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    onPause={handlePause}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right column — calendar + completion rates (sticky) */}
          <div className="w-full lg:w-[340px] shrink-0">
            <div className="lg:sticky lg:top-8 space-y-4">
              <RevisionCalendar />

              {/* Completion rates */}
              {stats &&
                (stats.completion_rate_7d > 0 || stats.completion_rate_30d > 0) && (
                  <div className="rounded-lg border bg-card px-4 py-3">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Completion Rates</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Last 7 days</span>
                        <span className="text-xs font-medium">{stats.completion_rate_7d}%</span>
                      </div>
                      <Progress value={stats.completion_rate_7d} className="h-1.5" />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">Last 30 days</span>
                        <span className="text-xs font-medium">{stats.completion_rate_30d}%</span>
                      </div>
                      <Progress value={stats.completion_rate_30d} className="h-1.5" />
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-card px-4 py-3 ${
        alert ? "border-red-300 dark:border-red-800" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}

function QueueSection({
  title,
  icon,
  count,
  items,
  completingId,
  onComplete,
  onSkip,
  onPause,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  items: RevisionQueueItem[];
  completingId: string | null;
  onComplete: (id: string, r: QualityRating) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
  onPause: (id: string) => Promise<void>;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-[11px] text-muted-foreground">({count})</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <RevisionCard
            key={item.schedule_id}
            item={item}
            onComplete={onComplete}
            onSkip={onSkip}
            onPause={onPause}
            completing={completingId === item.schedule_id}
          />
        ))}
      </div>
    </div>
  );
}
