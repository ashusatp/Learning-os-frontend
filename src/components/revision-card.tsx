"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Flame,
  MoreVertical,
  SkipForward,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [ratingOpen, setRatingOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"snooze" | "pause" | null>(null);

  const handleConfirm = () => {
    if (confirmAction === "snooze") {
      onSkip(item.schedule_id);
    } else if (confirmAction === "pause") {
      onPause(item.schedule_id);
    }
    setConfirmAction(null);
  };

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

          {/* Right: status + actions */}
          <div className="flex items-center gap-2 shrink-0">
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
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setRatingOpen(true)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark Done
                </Button>

                {/* 3-dot menu for snooze & pause */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setConfirmAction("snooze")}>
                      <SkipForward className="mr-2 h-4 w-4" />
                      Snooze 1 day
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setConfirmAction("pause")}>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause schedule
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Open subtopic link */}
                <a
                  href={`/goals/${resolvedGoalId}/subjects/${item.subject_id}/topics/${item.topic_id}/subtopics/${item.subtopic_id}`}
                  target="_blank"
                  rel="noopener"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </>
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
        </div>
      </div>

      {/* Rating modal */}
      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent className="sm:max-w-md gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg leading-snug">{item.subtopic_name}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {item.goal_title && <>{item.goal_title} &rsaquo; </>}{item.subject_name} &rsaquo; {item.topic_name}
            </DialogDescription>
          </DialogHeader>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap pb-4">
            <Badge
              variant="outline"
              className={`text-[11px] px-2 py-0.5 ${MASTERY_STYLES[item.mastery_level] || ""}`}
            >
              {item.mastery_level}
            </Badge>
            {item.status === "overdue" && (
              <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-red-600 border-red-300 dark:border-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {item.days_overdue}d overdue
              </Badge>
            )}
            {item.mistake_count > 0 && (
              <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {item.mistake_count} mistake{item.mistake_count !== 1 ? "s" : ""}
              </Badge>
            )}
            {item.consecutive_successes >= 3 && (
              <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-orange-600 border-orange-300 dark:border-orange-800">
                <Flame className="h-3 w-3 mr-1" />
                {item.consecutive_successes} streak
              </Badge>
            )}
          </div>

          {/* Self-rating — primary action */}
          {item.status !== "upcoming" && (
            <div className="space-y-3 pb-4">
              <p className="text-sm font-medium">
                Select how well you recalled this to mark it as done
              </p>
              <div className="grid grid-cols-4 gap-2">
                {RATING_CONFIG.map(({ rating, label, color, bg, desc }) => (
                  <button
                    key={rating}
                    className={`rounded-xl border-2 px-2 py-3 text-center transition-all hover:scale-[1.03] active:scale-[0.97] ${bg}`}
                    onClick={() => {
                      onComplete(item.schedule_id, rating);
                      setRatingOpen(false);
                    }}
                    disabled={completing}
                  >
                    <span className={`text-sm font-bold block ${color}`}>{label}</span>
                    <span className="block text-[11px] text-muted-foreground mt-1 leading-tight">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2.5 text-center">
            <div>
              <span className="text-[10px] text-muted-foreground block">Interval</span>
              <span className="text-xs font-semibold">{item.current_interval_days}d</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Ease</span>
              <span className="text-xs font-semibold">{item.ease_factor.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Priority</span>
              <span className="text-xs font-semibold">{item.priority_score.toFixed(1)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for snooze/pause */}
      <Dialog open={confirmAction !== null} onOpenChange={(v) => !v && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "snooze" ? "Snooze revision?" : "Pause schedule?"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              {confirmAction === "snooze"
                ? `This will postpone "${item.subtopic_name}" by 1 day. You can review it tomorrow.`
                : `This will pause all future revisions for "${item.subtopic_name}" until you resume it manually.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={confirmAction === "pause" ? "destructive" : "default"}
              onClick={handleConfirm}
            >
              {confirmAction === "snooze" ? "Snooze 1 day" : "Pause"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
