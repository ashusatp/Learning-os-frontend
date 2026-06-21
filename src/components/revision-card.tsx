"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  SkipForward,
  Pause,
  ExternalLink,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const RATING_CONFIG: { rating: QualityRating; label: string; color: string; desc: string }[] = [
  { rating: "AGAIN", label: "Again", color: "bg-red-500 hover:bg-red-600 text-white", desc: "Forgot completely" },
  { rating: "HARD", label: "Hard", color: "bg-orange-500 hover:bg-orange-600 text-white", desc: "Struggled to recall" },
  { rating: "GOOD", label: "Good", color: "bg-green-500 hover:bg-green-600 text-white", desc: "Recalled with effort" },
  { rating: "EASY", label: "Easy", color: "bg-blue-500 hover:bg-blue-600 text-white", desc: "Instant recall" },
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
  const [expanded, setExpanded] = useState(false);

  const weightage = item.exam_frequency * item.marks_per_question;

  return (
    <div
      className={`rounded-lg border bg-card overflow-hidden transition-colors ${STATUS_STYLES[item.status] || ""}`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold block truncate">
            {item.subtopic_name}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {item.goal_title && <>{item.goal_title} &rsaquo; </>}{item.subject_name} &rsaquo; {item.topic_name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${MASTERY_STYLES[item.mastery_level] || ""}`}
          >
            {item.mastery_level}
          </Badge>

          {item.mistake_count > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
              <AlertTriangle className="h-2.5 w-2.5" />
              {item.mistake_count}
            </Badge>
          )}

          {weightage > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {weightage} marks
            </Badge>
          )}

          {item.consecutive_successes >= 5 && (
            <Flame className="h-3.5 w-3.5 text-orange-500" />
          )}

          {item.status === "overdue" && (
            <span className="text-[10px] font-medium text-red-500">
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

          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded: rating buttons + actions */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Info row */}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Interval: {item.current_interval_days}d
            </span>
            <span>Ease: {item.ease_factor.toFixed(2)}</span>
            <span>Streak: {item.consecutive_successes}</span>
            {weightage > 0 && (
              <span>
                Weightage: {item.exam_frequency} Q &times; {item.marks_per_question} marks
              </span>
            )}
          </div>

          {/* Self-rating */}
          {item.status !== "upcoming" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                How well did you remember this?
              </p>
              <div className="flex items-center gap-2">
                {RATING_CONFIG.map(({ rating, label, color, desc }) => (
                  <Button
                    key={rating}
                    size="sm"
                    className={`flex-1 text-xs h-9 ${color}`}
                    onClick={() => onComplete(item.schedule_id, rating)}
                    disabled={completing}
                    title={desc}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="xs"
              className="gap-1 text-xs"
              onClick={() => onSkip(item.schedule_id)}
            >
              <SkipForward className="h-3 w-3" />
              Snooze 1d
            </Button>
            <Button
              variant="outline"
              size="xs"
              className="gap-1 text-xs"
              onClick={() => onPause(item.schedule_id)}
            >
              <Pause className="h-3 w-3" />
              Pause
            </Button>
            <div className="flex-1" />
            <a
              href={`/goals/${resolvedGoalId}/subjects/${item.subject_id}/topics/${item.topic_id}/subtopics/${item.subtopic_id}`}
              target="_blank"
              rel="noopener"
            >
              <Button
                variant="outline"
                size="xs"
                className="gap-1 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
                Open Subtopic
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
