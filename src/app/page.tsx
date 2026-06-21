"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Target,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Flame,
  ArrowRight,
  Calendar,
  TrendingUp,
  ArrowUpCircle,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { GoalCard } from "@/components/goal-card";
import { CreateDialog, FieldConfig } from "@/components/create-dialog";
import { CardGridSkeleton } from "@/components/page-skeleton";
import { AuthGuard } from "@/components/auth-guard";
import { RevisionCard } from "@/components/revision-card";
import { RevisionCalendar } from "@/components/revision-calendar";
import { useAuthStore } from "@/stores/auth-store";
import { useGoalStore } from "@/stores/goal-store";
import { useRevisionStore } from "@/stores/revision-store";
import { PromotionSuggestion, QualityRating, RevisionQueueItem } from "@/types";
import { toast } from "sonner";

const MAX_VISIBLE_CARDS = 5;

const goalFields: FieldConfig[] = [
  {
    name: "title",
    label: "Title",
    type: "text",
    placeholder: "e.g., GATE 2027",
    required: true,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Describe your learning goal...",
  },
  {
    name: "target_exam",
    label: "Target Exam",
    type: "text",
    placeholder: "e.g., GATE, UPSC, JEE",
  },
  {
    name: "target_year",
    label: "Target Year",
    type: "number",
    placeholder: "e.g., 2027",
  },
];

export default function HomePage() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  );
}

function HomeContent() {
  const { user } = useAuthStore();
  const { goals, loading: goalsLoading, error: goalsError, fetchGoals, createGoal } = useGoalStore();
  const {
    overdue,
    dueToday,
    upcoming,
    stats,
    settings,
    loading: revLoading,
    fetchGlobalQueue,
    fetchSettings,
    completeRevision,
    skipRevision,
    pauseRevision,
    promoteMastery,
  } = useRevisionStore();

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [promotionPending, setPromotionPending] = useState<PromotionSuggestion | null>(null);

  useEffect(() => {
    if (user) {
      fetchGoals(user.id);
      fetchGlobalQueue();
      fetchSettings();
    }
  }, [user, fetchGoals, fetchGlobalQueue, fetchSettings]);

  const handleCreateGoal = async (data: Record<string, string | number>) => {
    if (user) {
      await createGoal(user.id, data);
    }
  };

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

  // Merge all items in priority order: overdue → due today → upcoming, capped
  const allItems = useMemo(() => [...overdue, ...dueToday, ...upcoming], [overdue, dueToday, upcoming]);
  const visibleItems = useMemo(() => allItems.slice(0, MAX_VISIBLE_CARDS), [allItems]);
  const hasMore = allItems.length > MAX_VISIBLE_CARDS;
  const hasRevisions = allItems.length > 0;

  const revIsEmpty = !revLoading && !hasRevisions;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* ── Revisions Section ── */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Revisions</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your scheduled revisions across all goals
              </p>
            </div>
            {hasRevisions && (
              <Link href="/revisions">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  View All
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>

          {/* Two-column: cards left, calendar right */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left column — stats + queue preview */}
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

              {/* Welcome back banner */}
              {!revLoading && overdue.length > 5 && (
                <div className="mb-6 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Welcome back!</p>
                      <p className="text-xs text-muted-foreground">
                        You have {overdue.length} overdue items. Focus on the
                        highest-priority ones first — they&apos;re sorted by importance.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading */}
              {revLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border bg-card px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {revIsEmpty && (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    No revisions due. Add subtopics to your revision queue and they&apos;ll appear here.
                  </p>
                </div>
              )}

              {/* Revision cards (limited) */}
              {!revLoading && hasRevisions && (
                <div className="space-y-2">
                  {visibleItems.map((item) => (
                    <RevisionCard
                      key={item.schedule_id}
                      item={item}
                      onComplete={handleComplete}
                      onSkip={handleSkip}
                      onPause={handlePause}
                      completing={completingId === item.schedule_id}
                    />
                  ))}

                  {/* View all link */}
                  {hasMore && (
                    <Link href="/revisions">
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-card/50 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer">
                        <span>
                          View all {allItems.length} revisions
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </Link>
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
        </div>

        {/* ── Goals Section ── */}
        <div className="border-t pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Your Goals</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Track and manage your learning objectives
              </p>
            </div>
            <CreateDialog
              title="Goal"
              description="Create a new learning goal to start organizing your study plan."
              fields={goalFields}
              onSubmit={handleCreateGoal}
            />
          </div>

          {goalsLoading && <CardGridSkeleton count={3} cardHeight="h-48" />}

          {goalsError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {goalsError}
            </div>
          )}

          {!goalsLoading && !goalsError && goals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Create your first learning goal to start organizing subjects, topics, and tracking progress.
              </p>
            </div>
          )}

          {!goalsLoading && goals.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal, i) => (
                <div
                  key={goal.id}
                  className="animate-card-enter"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <GoalCard goal={goal} />
                </div>
              ))}
            </div>
          )}
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
