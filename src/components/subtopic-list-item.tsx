"use client";

import { RotateCcw, CheckCircle, XCircle, GripVertical } from "lucide-react";
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

const masteryConfig: Record<MasteryLevel, { label: string; className: string }> = {
  NOT_STARTED: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  BEGINNER: { label: "Beginner", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  INTERMEDIATE: { label: "Intermediate", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400" },
  ADVANCED: { label: "Advanced", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  MASTERED: { label: "Mastered", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
};

export function SubTopicListItem({ subtopic, compact, dragHandleProps, actions, onClick }: SubTopicListItemProps) {
  const mastery = masteryConfig[subtopic.mastery_level];
  const accuracy =
    subtopic.questions_solved > 0
      ? Math.round((subtopic.questions_correct / subtopic.questions_solved) * 100)
      : 0;
  const confidencePercent = Math.round(subtopic.confidence_level * 100);

  if (compact) {
    return (
      <div onClick={onClick} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-all hover:shadow-sm hover:border-primary/30 cursor-pointer">
        {dragHandleProps && (
          <div {...dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing">
            <GripVertical className="h-4 w-4" />
          </div>
        )}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
          {subtopic.order}
        </span>
        <span className="text-sm font-medium truncate flex-1">{subtopic.name}</span>
        <Badge variant="outline" className={`${mastery.className} text-[10px] shrink-0`}>
          {mastery.label}
        </Badge>
        <span className="text-xs text-muted-foreground shrink-0 w-12 text-right">{confidencePercent}%</span>
        {actions}
      </div>
    );
  }

  return (
    <div onClick={onClick} className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30 cursor-pointer">
      {dragHandleProps && (
        <div {...dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
        {subtopic.order}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold truncate">{subtopic.name}</span>
          <Badge variant="outline" className={`${mastery.className} text-[10px] shrink-0`}>
            {mastery.label}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> {subtopic.revision_count} revisions
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" /> {accuracy}% accuracy
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-500" /> {subtopic.mistake_count} mistakes
          </span>
        </div>
      </div>
      <div className="shrink-0 w-24">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-medium">{confidencePercent}%</span>
        </div>
        <Progress value={confidencePercent} className="h-1.5" />
      </div>
      {actions}
    </div>
  );
}
