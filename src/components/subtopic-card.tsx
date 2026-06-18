"use client";

import { RotateCcw, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SubTopic, MasteryLevel } from "@/types";

interface SubTopicCardProps {
  subtopic: SubTopic;
}

const masteryConfig: Record<
  MasteryLevel,
  { label: string; className: string }
> = {
  NOT_STARTED: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  BEGINNER: { label: "Beginner", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  INTERMEDIATE: { label: "Intermediate", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400" },
  ADVANCED: { label: "Advanced", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  MASTERED: { label: "Mastered", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
};

export function SubTopicCard({ subtopic }: SubTopicCardProps) {
  const mastery = masteryConfig[subtopic.mastery_level];
  const accuracy =
    subtopic.questions_solved > 0
      ? Math.round(
          (subtopic.questions_correct / subtopic.questions_solved) * 100
        )
      : 0;
  const confidencePercent = Math.round(subtopic.confidence_level * 100);

  return (
    <Card className="transition-all hover:shadow-lg hover:border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{subtopic.name}</CardTitle>
          <Badge variant="outline" className={mastery.className}>
            {mastery.label}
          </Badge>
        </div>
        {subtopic.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {subtopic.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">{confidencePercent}%</span>
          </div>
          <Progress value={confidencePercent} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Revisions</p>
              <p className="font-semibold">{subtopic.revision_count}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">Accuracy</p>
              <p className="font-semibold">
                {subtopic.questions_solved > 0 ? `${accuracy}%` : "--"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
            <div>
              <p className="text-xs text-muted-foreground">Mistakes</p>
              <p className="font-semibold">{subtopic.mistake_count}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Solved</p>
              <p className="font-semibold">
                {subtopic.questions_correct}/{subtopic.questions_solved}
              </p>
            </div>
          </div>
        </div>

        {subtopic.last_revised_at && (
          <p className="text-xs text-muted-foreground pt-1 border-t">
            Last revised:{" "}
            {new Date(subtopic.last_revised_at).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
