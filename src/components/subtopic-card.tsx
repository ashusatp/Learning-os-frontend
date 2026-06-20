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
    badge: "bg-muted text-muted-foreground",
    accent: "from-slate-50 to-transparent dark:from-slate-900/40",
  },
  BEGINNER: {
    label: "Beginner",
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    accent: "from-red-50 to-transparent dark:from-red-950/30",
  },
  INTERMEDIATE: {
    label: "Intermediate",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    accent: "from-amber-50 to-transparent dark:from-amber-950/30",
  },
  ADVANCED: {
    label: "Advanced",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    accent: "from-blue-50 to-transparent dark:from-blue-950/30",
  },
  MASTERED: {
    label: "Mastered",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    accent: "from-emerald-50 to-transparent dark:from-emerald-950/30",
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
            ? `Revised ${new Date(subtopic.last_revised_at).toLocaleDateString()}`
            : "Not revised yet"}
        </div>
      </div>
    </div>
  );
}
