"use client";

import { RotateCcw, AlertCircle, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SubTopic, MasteryLevel } from "@/types";

interface SubTopicCardProps {
  subtopic: SubTopic;
}

const masteryConfig: Record<
  MasteryLevel,
  { label: string; badge: string; accent: string }
> = {
  NOT_STARTED: {
    label: "Not Started",
    badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
    accent: "from-zinc-100 to-transparent dark:from-zinc-800/60",
  },
  BEGINNER: {
    label: "Beginner",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30",
    accent: "from-violet-100 to-transparent dark:from-violet-500/15",
  },
  INTERMEDIATE: {
    label: "Intermediate",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
    accent: "from-amber-100 to-transparent dark:from-amber-500/15",
  },
  ADVANCED: {
    label: "Advanced",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30",
    accent: "from-sky-100 to-transparent dark:from-sky-500/15",
  },
  MASTERED: {
    label: "Mastered",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
    accent: "from-emerald-100 to-transparent dark:from-emerald-500/15",
  },
};

export function SubTopicCard({ subtopic }: SubTopicCardProps) {
  const mastery = masteryConfig[subtopic.mastery_level];
  const confidencePercent = Math.round(subtopic.confidence_level * 100);

  return (
    <div className="group relative rounded-xl border bg-card text-card-foreground transition-all hover:shadow-lg hover:border-primary/30 overflow-hidden flex flex-col">
      {/* Colored gradient header band */}
      <div className={`bg-gradient-to-b ${mastery.accent} px-4 pt-8 pb-3`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug">{subtopic.name}</h3>
          <Badge variant="outline" className={`${mastery.badge} text-[10px] shrink-0`}>
            {mastery.label}
          </Badge>
        </div>
        {subtopic.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {subtopic.description}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex flex-col gap-3 flex-1">
        {/* Confidence bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-semibold tabular-nums">{confidencePercent}%</span>
          </div>
          <Progress value={confidencePercent} className="h-1.5" />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">{subtopic.revision_count}</span>
            <span>revisions</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
            <span className="font-semibold text-foreground">{subtopic.mistake_count}</span>
            <span>mistakes</span>
          </div>
        </div>
      </div>

      {/* Footer — always rendered to keep card height consistent */}
      <div className="px-4 pb-3 pt-0">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 border-t pt-2">
          <CalendarClock className="h-3 w-3" />
          {subtopic.last_revised_at
            ? `Revised ${new Date(subtopic.last_revised_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
            : "Not revised yet"}
        </div>
      </div>
    </div>
  );
}
