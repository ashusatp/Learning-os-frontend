"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Flame,
  TrendingUp,
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Header, BreadcrumbEntry } from "@/components/header";
import { RevisionCard } from "@/components/revision-card";
import { useRevisionStore } from "@/stores/revision-store";
import { useGoalStore } from "@/stores/goal-store";
import { QualityRating } from "@/types";

export default function RevisionDashboardPage() {
  const params = useParams();
  const goalId = params.goalId as string;

  const { goals, activeGoal, setActiveGoal } = useGoalStore();
  const {
    overdue,
    dueToday,
    upcoming,
    stats,
    loading,
    error,
    fetchQueue,
    completeRevision,
    skipRevision,
    pauseRevision,
  } = useRevisionStore();

  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) setActiveGoal(goal);
  }, [goals, goalId, setActiveGoal]);

  useEffect(() => {
    if (goalId) fetchQueue(goalId);
  }, [goalId, fetchQueue]);

  const handleComplete = useCallback(
    async (scheduleId: string, rating: QualityRating) => {
      setCompletingId(scheduleId);
      try {
        await completeRevision(scheduleId, rating);
      } finally {
        setCompletingId(null);
      }
    },
    [completeRevision]
  );

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

  const breadcrumbs: BreadcrumbEntry[] = [
    { label: activeGoal?.title || "Goal", href: `/goals/${goalId}` },
    { label: "Revisions" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header breadcrumbs={breadcrumbs} />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        {/* Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Revision Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeGoal?.title || ""}
            </p>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
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
        {!loading && !error && overdue.length === 0 && dueToday.length === 0 && upcoming.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              No revisions due. Start studying subtopics and they&apos;ll appear here when it&apos;s time to review.
            </p>
          </div>
        )}

        {/* Queue sections */}
        {!loading && !error && (
          <div className="space-y-6">
            {overdue.length > 0 && (
              <QueueSection
                title="Overdue"
                icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                count={overdue.length}
                items={overdue}
                goalId={goalId}
                completingId={completingId}
                onComplete={handleComplete}
                onSkip={handleSkip}
                onPause={handlePause}
              />
            )}

            {dueToday.length > 0 && (
              <QueueSection
                title="Due Today"
                icon={<Clock className="h-4 w-4 text-violet-500" />}
                count={dueToday.length}
                items={dueToday}
                goalId={goalId}
                completingId={completingId}
                onComplete={handleComplete}
                onSkip={handleSkip}
                onPause={handlePause}
              />
            )}

            {upcoming.length > 0 && (
              <QueueSection
                title="Upcoming (next 3 days)"
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                count={upcoming.length}
                items={upcoming}
                goalId={goalId}
                completingId={completingId}
                onComplete={handleComplete}
                onSkip={handleSkip}
                onPause={handlePause}
              />
            )}

            {/* Completion rates */}
            {stats && (stats.completion_rate_7d > 0 || stats.completion_rate_30d > 0) && (
              <div className="flex items-center gap-4 pt-4 border-t text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>7-day completion: {stats.completion_rate_7d}%</span>
                <span>30-day completion: {stats.completion_rate_30d}%</span>
              </div>
            )}
          </div>
        )}
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
  goalId,
  completingId,
  onComplete,
  onSkip,
  onPause,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  items: import("@/types").RevisionQueueItem[];
  goalId: string;
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
            goalId={goalId}
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
