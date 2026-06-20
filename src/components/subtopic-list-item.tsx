"use client";

import { RotateCcw, AlertCircle, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SubTopic, MasteryLevel } from "@/types";

interface SubTopicListItemProps {
  subtopic: SubTopic;
  compact?: boolean;
  dragHandleProps?: Record<string, unknown>;
  actions?: React.ReactNode;
  onClick?: () => void;
}

const masteryConfig: Record<MasteryLevel, { label: string; badge: string; accent: string }> = {
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

export function SubTopicListItem({ subtopic, compact, dragHandleProps, actions, onClick }: SubTopicListItemProps) {
  const mastery = masteryConfig[subtopic.mastery_level];
  const confidencePercent = Math.round(subtopic.confidence_level * 100);

  if (compact) {
    return (
      <div onClick={onClick} className={`flex items-center gap-3 rounded-lg border bg-gradient-to-r ${mastery.accent} px-3 py-2 transition-all hover:shadow-sm hover:border-primary/30 cursor-pointer`}>
        {dragHandleProps && (
          <div {...dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing">
            <GripVertical className="h-4 w-4" />
          </div>
        )}
        <span className="text-sm font-medium truncate flex-1">{subtopic.name}</span>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
          <span className="flex items-center gap-1">
            <RotateCcw className="h-3 w-3 text-primary" />
            <span className="font-semibold text-foreground">{subtopic.revision_count}</span>
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
            <span className="font-semibold text-foreground">{subtopic.mistake_count}</span>
          </span>
        </div>
        <Badge variant="outline" className={`${mastery.badge} text-[10px] shrink-0`}>
          {mastery.label}
        </Badge>
        <span className="text-xs font-semibold tabular-nums shrink-0 w-10 text-right">{confidencePercent}%</span>
        {actions}
      </div>
    );
  }

  return (
    <div onClick={onClick} className={`flex items-center gap-4 rounded-xl border overflow-hidden bg-gradient-to-r ${mastery.accent} p-4 transition-all hover:shadow-md hover:border-primary/30 cursor-pointer`}>
      {dragHandleProps && (
        <div {...dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold truncate">{subtopic.name}</span>
          <Badge variant="outline" className={`${mastery.badge} text-[10px] shrink-0`}>
            {mastery.label}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <RotateCcw className="h-3 w-3 text-primary" />
            <span className="font-semibold text-foreground">{subtopic.revision_count}</span> revisions
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
            <span className="font-semibold text-foreground">{subtopic.mistake_count}</span> mistakes
          </span>
        </div>
      </div>
      <div className="shrink-0 w-24">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-semibold tabular-nums">{confidencePercent}%</span>
        </div>
        <Progress value={confidencePercent} className="h-1.5" />
      </div>
      {actions}
    </div>
  );
}
