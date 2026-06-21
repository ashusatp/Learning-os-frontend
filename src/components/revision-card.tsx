"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  SkipForward,
  Pause,
  ExternalLink,
  Flame,
  TrendingUp,
  Zap,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QualityRating, RevisionQueueItem } from "@/types";

const MASTERY_STYLES: Record<string, string> = {
  BEGINNER: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  INTERMEDIATE: "bg-yellow-100 text-yellow-700 dark:bg-amber-500/20 dark:text-amber-300",
  ADVANCED: "bg-blue-100 text-blue-700 dark:bg-sky-500/20 dark:text-sky-300",
  MASTERED: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
};

const STATUS_STYLES: Record<string, string> = {
  overdue: "border-l-4 border-l-red-500",
  due_today: "border-l-4 border-l-violet-500",
  upcoming: "border-l-4 border-l-zinc-400 opacity-70",
};

const RATING_CONFIG: { rating: QualityRating; label: string; color: string; bg: string; desc: string }[] = [
  { rating: "AGAIN", label: "Again", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 border-red-200 dark:border-red-800", desc: "Forgot completely" },
  { rating: "HARD", label: "Hard", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-950/60 border-orange-200 dark:border-orange-800", desc: "Struggled to recall" },
  { rating: "GOOD", label: "Good", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 hover:bg-green-100 dark:bg-green-950/40 dark:hover:bg-green-950/60 border-green-200 dark:border-green-800", desc: "Recalled with effort" },
  { rating: "EASY", label: "Easy", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 border-blue-200 dark:border-blue-800", desc: "Instant recall" },
];

interface RevisionCardProps {
  item: RevisionQueueItem;
  onComplete: (scheduleId: string, rating: QualityRating) => Promise<void>;
  onSkip: (scheduleId: string) => Promise<void>;
  onPause: (scheduleId: string) => Promise<void>;
  goalId?: string;
  completing?: boolean;
}

export function RevisionCard({
  item,
  onComplete,
  onSkip,
  onPause,
  goalId,
  completing,
}: RevisionCardProps) {
  const resolvedGoalId = goalId || item.goal_id;
  const [open, setOpen] = useState(false);

  const weightage = item.exam_frequency * item.marks_per_question;

  return (
    <>
      {/* Compact card */}
      <div
        className={`rounded-lg border bg-card overflow-hidden transition-colors ${STATUS_STYLES[item.status] || ""}`}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Left: name + breadcrumb */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold truncate">
                {item.subtopic_name}
              </span>
              {item.consecutive_successes >= 5 && (
                <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-muted-foreground truncate">
                {item.goal_title && <>{item.goal_title} &rsaquo; </>}{item.subject_name} &rsaquo; {item.topic_name}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 shrink-0 ${MASTERY_STYLES[item.mastery_level] || ""}`}
              >
                {item.mastery_level}
              </Badge>
            </div>
          </div>

          {/* Right: status + action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {item.status === "overdue" && (
              <span className="text-[10px] font-medium text-red-500 whitespace-nowrap">
                {item.days_overdue}d overdue
              </span>
            )}
            {item.status === "due_today" && (
              <span className="text-[10px] font-medium text-violet-500">
                due today
              </span>
            )}
            {item.status === "upcoming" && (
              <span className="text-[10px] text-muted-foreground">
                in {Math.ceil((new Date(item.next_revision_at).getTime() - Date.now()) / 86400000)}d
              </span>
            )}

            {item.status !== "upcoming" ? (
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setOpen(true)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark Done
              </Button>
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{item.subtopic_name}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              {item.goal_title && <>{item.goal_title} &rsaquo; </>}{item.subject_name} &rsaquo; {item.topic_name}
            </p>
          </DialogHeader>

          {/* Status + mastery */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 ${MASTERY_STYLES[item.mastery_level] || ""}`}
            >
              {item.mastery_level}
            </Badge>
            {item.status === "overdue" && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 text-red-600 border-red-300 dark:border-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {item.days_overdue}d overdue
              </Badge>
            )}
            {item.mistake_count > 0 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {item.mistake_count} mistake{item.mistake_count !== 1 ? "s" : ""}
              </Badge>
            )}
            {item.consecutive_successes >= 3 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 text-orange-600 border-orange-300 dark:border-orange-800">
                <Flame className="h-3 w-3 mr-1" />
                {item.consecutive_successes} streak
              </Badge>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Clock className="h-3 w-3" />
                <span className="text-[10px]">Interval</span>
              </div>
              <span className="text-sm font-semibold">{item.current_interval_days}d</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[10px]">Ease</span>
              </div>
              <span className="text-sm font-semibold">{item.ease_factor.toFixed(2)}</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Zap className="h-3 w-3" />
                <span className="text-[10px]">Priority</span>
              </div>
              <span className="text-sm font-semibold">{item.priority_score.toFixed(1)}</span>
            </div>
            {weightage > 0 && (
              <div className="text-center col-span-3 pt-2 border-t border-border/50">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <BarChart3 className="h-3 w-3" />
                  <span className="text-[10px]">Weightage</span>
                </div>
                <span className="text-sm font-semibold">{item.exam_frequency} Q &times; {item.marks_per_question} marks</span>
              </div>
            )}
          </div>

          {/* Self-rating */}
          {item.status !== "upcoming" && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                How well did you remember this?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {RATING_CONFIG.map(({ rating, label, color, bg, desc }) => (
                  <button
                    key={rating}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${bg}`}
                    onClick={() => {
                      onComplete(item.schedule_id, rating);
                      setOpen(false);
                    }}
                    disabled={completing}
                  >
                    <span className={`text-sm font-semibold ${color}`}>{label}</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                onSkip(item.schedule_id);
                setOpen(false);
              }}
            >
              <SkipForward className="h-3.5 w-3.5" />
              Snooze 1d
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                onPause(item.schedule_id);
                setOpen(false);
              }}
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </Button>
            <div className="flex-1" />
            <a
              href={`/goals/${resolvedGoalId}/subjects/${item.subject_id}/topics/${item.topic_id}/subtopics/${item.subtopic_id}`}
              target="_blank"
              rel="noopener"
            >
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="h-3.5 w-3.5" />
                Open Subtopic
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
