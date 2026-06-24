"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
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
  BookOpen,
  Target,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { AuthGuard } from "@/components/auth-guard";
import { RevisionCard } from "@/components/revision-card";
import { useRevisionStore } from "@/stores/revision-store";
import { useCampaignStore } from "@/stores/campaign-store";
import { useGoalStore } from "@/stores/goal-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { RevisionCalendar } from "@/components/revision-calendar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CalendarCompletedItem, CalendarDateItems, CampaignItem, CampaignQueue, CampaignType, PromotionSuggestion, QualityRating, RevisionQueueItem } from "@/types";
import { toast } from "sonner";
import api from "@/lib/api";

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
    loading,
    error,
    fetchGlobalQueue,
    fetchSettings,
    completeRevision,
    skipRevision,
    pauseRevision,
    promoteMastery,
  } = useRevisionStore();
  const {
    todaysQueue,
    fetchTodaysQueue,
    completeItem: completeCampaignItem,
  } = useCampaignStore();

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completingCampaignItemId, setCompletingCampaignItemId] = useState<string | null>(null);
  const [confirmCampaignItemId, setConfirmCampaignItemId] = useState<string | null>(null);
  const [promotionPending, setPromotionPending] = useState<PromotionSuggestion | null>(null);
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateItems, setDateItems] = useState<CalendarDateItems | null>(null);
  const [dateLoading, setDateLoading] = useState(false);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);
  const isSelectedToday = selectedDate === todayStr;

  const handleDateSelect = useCallback(async (date: string | null) => {
    setSelectedDate(date);
    if (!date) {
      setDateItems(null);
      return;
    }
    setDateLoading(true);
    try {
      const res = await api.get<CalendarDateItems>(`/revisions/calendar/${date}`);
      setDateItems(res.data);
    } catch {
      setDateItems(null);
    }
    setDateLoading(false);
  }, []);

  // Auto-select today on mount to show completed items
  useEffect(() => {
    handleDateSelect(todayStr);
  }, [todayStr]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      fetchGoals(user.id);
      fetchGlobalQueue();
      fetchSettings();
      fetchTodaysQueue();
    }
  }, [user, fetchGoals, fetchGlobalQueue, fetchSettings, fetchTodaysQueue]);

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

  const handleCompleteCampaignItem = useCallback(
    async (itemId: string) => {
      setCompletingCampaignItemId(itemId);
      try {
        await completeCampaignItem(itemId);
        toast.success("Item completed!");
      } catch {
        toast.error("Failed to complete item");
      }
      setCompletingCampaignItemId(null);
    },
    [completeCampaignItem]
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
    <TooltipProvider>
    <div className="flex min-h-screen flex-col bg-background">
      <Header breadcrumbs={[{ label: "Revisions" }]} />

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
                  tooltip="Total revisions due today, including any overdue items carried forward"
                />
                <StatCard
                  icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                  label="Overdue"
                  value={stats.overdue_count}
                  alert={stats.overdue_count > 0}
                  tooltip="Revisions that were due on a previous day but haven't been completed yet"
                />
                <StatCard
                  icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                  label="Done Today"
                  value={stats.completed_today}
                  tooltip="Number of revisions you've completed today"
                />
                <StatCard
                  icon={<Flame className="h-4 w-4 text-orange-500" />}
                  label="Streak"
                  value={`${stats.daily_streak}d`}
                  subValue={`Best: ${stats.longest_streak}d`}
                  tooltip="Consecutive days with at least one completed revision. Resets if you miss a day."
                />
              </div>
            )}

            {/* Daily progress */}
            {stats && (stats.due_today > 0 || stats.completed_today > 0) && (
              <Tooltip>
                <TooltipTrigger render={<div />}>
                  <div className="mb-6 rounded-lg border bg-card px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">Today&apos;s Progress</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {stats.completed_today} / {stats.due_today + stats.completed_today} done
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        100,
                        (stats.completed_today / (stats.due_today + stats.completed_today)) * 100
                      )}
                      className="h-2"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Tracks your progress for today — includes overdue items carried forward plus today&apos;s scheduled revisions
                </TooltipContent>
              </Tooltip>
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

            {/* Date selected (non-today) → show date items panel */}
            {selectedDate && !isSelectedToday ? (
              <DateItemsPanel
                date={selectedDate}
                items={dateItems}
                loading={dateLoading}
                onClear={() => handleDateSelect(null)}
              />
            ) : (
              <>
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
                {isEmpty && !isSelectedToday && (
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
                {!loading && !error && (
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

                    {/* Completed today — shown when today is selected on calendar */}
                    {isSelectedToday && dateItems && dateItems.completed.length > 0 && (
                      <CompletedSection items={dateItems.completed} />
                    )}

                    {isEmpty && isSelectedToday && (!dateItems || dateItems.completed.length === 0) && todaysQueue.length === 0 && (
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
                  </div>
                )}

                {/* Campaign Queues */}
                {todaysQueue.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold">Campaign Revisions</h2>
                      </div>
                      <Link
                        href="/campaigns"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View all campaigns →
                      </Link>
                    </div>
                    {todaysQueue.map((queue) => (
                      <CampaignQueueSection
                        key={queue.campaign_id}
                        queue={queue}
                        onComplete={setConfirmCampaignItemId}
                        completingId={completingCampaignItemId}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right column — calendar + completion rates (sticky) */}
          <div className="w-full lg:w-[340px] shrink-0">
            <div className="lg:sticky lg:top-8 space-y-4">
              <RevisionCalendar selectedDate={selectedDate} onDateSelect={handleDateSelect} />

              {/* Completion rates */}
              {stats &&
                (stats.completion_rate_7d > 0 || stats.completion_rate_30d > 0) && (
                  <Tooltip>
                    <TooltipTrigger render={<div />}>
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
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      Percentage of due revisions you completed vs skipped or missed
                    </TooltipContent>
                  </Tooltip>
                )}

            </div>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={!!confirmCampaignItemId}
        onOpenChange={(open) => { if (!open) setConfirmCampaignItemId(null); }}
        title="Mark as done?"
        description="This item will be marked as completed. This action can't be undone."
        confirmLabel="Mark Done"
        onConfirm={() => {
          if (confirmCampaignItemId) handleCompleteCampaignItem(confirmCampaignItemId);
        }}
        loading={!!completingCampaignItemId}
      />
    </div>
    </TooltipProvider>
  );
}

const MASTERY_STYLES: Record<string, string> = {
  BEGINNER: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  INTERMEDIATE: "bg-yellow-100 text-yellow-700 dark:bg-amber-500/20 dark:text-amber-300",
  ADVANCED: "bg-blue-100 text-blue-700 dark:bg-sky-500/20 dark:text-sky-300",
  MASTERED: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
};

const RATING_LABELS: Record<string, { label: string; color: string }> = {
  AGAIN: { label: "Again", color: "text-red-500" },
  HARD: { label: "Hard", color: "text-orange-500" },
  GOOD: { label: "Good", color: "text-green-500" },
  EASY: { label: "Easy", color: "text-blue-500" },
};

function DateItemsPanel({
  date,
  items,
  loading,
  onClear,
}: {
  date: string;
  items: CalendarDateItems | null;
  loading: boolean;
  onClear: () => void;
}) {
  const [y, m, d] = date.split("-").map(Number);
  const formatted = new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{formatted}</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onClear}>
          Back to queue
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && items && (
        <div className="space-y-5">
          {items.scheduled.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-xs font-medium">Scheduled ({items.scheduled.length})</span>
              </div>
              <div className="space-y-2">
                {items.scheduled.map((item) => (
                  <div key={item.schedule_id} className="rounded-lg border border-l-4 border-l-violet-500 bg-card px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{item.subtopic_name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 shrink-0 ${MASTERY_STYLES[item.mastery_level] || ""}`}
                      >
                        {item.mastery_level}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {item.goal_title} &rsaquo; {item.subject_name} &rsaquo; {item.topic_name}
                    </span>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Interval: {item.current_interval_days}d
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.completed.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs font-medium">Completed ({items.completed.length})</span>
              </div>
              <div className="space-y-2">
                {items.completed.map((item, i) => (
                  <div key={`${item.subtopic_id}-${i}`} className="rounded-lg border border-l-4 border-l-green-500 bg-card px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{item.subtopic_name}</span>
                      <span className={`text-xs font-medium shrink-0 ${RATING_LABELS[item.quality_rating]?.color || ""}`}>
                        {RATING_LABELS[item.quality_rating]?.label || item.quality_rating}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {item.goal_title} &rsaquo; {item.subject_name} &rsaquo; {item.topic_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.scheduled.length === 0 && items.completed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <p className="text-sm text-muted-foreground">No revisions on this date</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  alert,
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subValue?: string;
  alert?: boolean;
  tooltip?: string;
}) {
  const card = (
    <div
      className={`rounded-lg border bg-card px-4 py-3 ${
        alert ? "border-red-300 dark:border-red-800" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold">{value}</span>
        {subValue && <span className="text-[10px] text-muted-foreground">{subValue}</span>}
      </div>
    </div>
  );

  if (!tooltip) return card;

  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>
        {card}
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
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

const CAMPAIGN_TYPE_META: Record<CampaignType, { label: string; icon: React.ReactNode }> = {
  SUBTOPIC_REVISION: { label: "Subtopic Revision", icon: <BookOpen className="h-3.5 w-3.5" /> },
  MISTAKE_REVIEW: { label: "Mistake Review", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  PYQ_PRACTICE: { label: "PYQ Practice", icon: <Target className="h-3.5 w-3.5" /> },
};

function CampaignQueueSection({
  queue,
  onComplete,
  completingId,
}: {
  queue: CampaignQueue;
  onComplete: (itemId: string) => void;
  completingId: string | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const meta = CAMPAIGN_TYPE_META[queue.campaign_type];
  const pendingItems = queue.items.filter((i) => !i.is_completed);
  const doneItems = queue.items.filter((i) => i.is_completed);
  const allDone = pendingItems.length === 0 && doneItems.length > 0;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {meta.icon}
          <span className="text-sm font-semibold truncate">{queue.campaign_name}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {meta.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {queue.completed_for_day}/{queue.total_for_day}
          </span>
          {allDone && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
        </div>
      </button>

      {/* Progress bar */}
      <div className="px-4">
        <Progress
          value={queue.total_for_day > 0 ? (queue.completed_for_day / queue.total_for_day) * 100 : 0}
          className="h-1"
        />
      </div>

      {/* Items */}
      {expanded && (
        <div className="px-4 py-3 space-y-2">
          {pendingItems.map((item) => (
            <CampaignQueueItemCard
              key={item.id}
              item={item}
              campaignType={queue.campaign_type}
              onComplete={onComplete}
              completing={completingId === item.id}
            />
          ))}
          {doneItems.map((item) => (
            <CampaignQueueItemCard
              key={item.id}
              item={item}
              campaignType={queue.campaign_type}
              onComplete={onComplete}
              completing={false}
            />
          ))}
          {queue.items.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No items scheduled for today
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CampaignQueueItemCard({
  item,
  campaignType,
  onComplete,
  completing,
}: {
  item: CampaignItem;
  campaignType: CampaignType;
  onComplete: (id: string) => void;
  completing: boolean;
}) {
  const title =
    campaignType === "SUBTOPIC_REVISION"
      ? item.subtopic_name
      : campaignType === "MISTAKE_REVIEW"
      ? item.subtopic_name || "Mistake"
      : item.subtopic_name || "PYQ";

  const subtitle =
    [item.subject_name, item.topic_name].filter(Boolean).join(" › ") || "";

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors ${
        item.is_completed
          ? "border-l-4 border-l-green-500 opacity-60"
          : "border-l-4 border-l-violet-500"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {item.is_completed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-violet-500 shrink-0" />
            )}
            <span
              className={`text-sm font-medium truncate ${
                item.is_completed ? "line-through text-muted-foreground" : ""
              }`}
            >
              {title}
            </span>
          </div>
          {subtitle && (
            <span className="text-[11px] text-muted-foreground ml-[22px]">
              {subtitle}
            </span>
          )}
        </div>

        {!item.is_completed && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={() => onComplete(item.id)}
            disabled={completing}
          >
            {completing ? "..." : "Done"}
          </Button>
        )}
      </div>
    </div>
  );
}

function CompletedSection({ items }: { items: CalendarCompletedItem[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <h2 className="text-sm font-medium">Completed Today</h2>
        <span className="text-[11px] text-muted-foreground">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={`${item.subtopic_id}-${i}`}
            className="rounded-lg border border-l-4 border-l-green-500 bg-card px-4 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold truncate">{item.subtopic_name}</span>
              <span className={`text-xs font-medium shrink-0 ${RATING_LABELS[item.quality_rating]?.color || ""}`}>
                {RATING_LABELS[item.quality_rating]?.label || item.quality_rating}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {item.goal_title} &rsaquo; {item.subject_name} &rsaquo; {item.topic_name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
