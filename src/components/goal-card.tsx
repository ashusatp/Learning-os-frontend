"use client";

import Link from "next/link";
import { Target, Calendar, ArrowRight, Archive, ArchiveRestore } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Goal } from "@/types";

interface GoalCardProps {
  goal: Goal;
  onArchive?: () => void;
}

export function GoalCard({ goal, onArchive }: GoalCardProps) {
  return (
    <Card className={`group flex flex-col h-full transition-all hover:shadow-lg hover:border-primary/30 ${goal.is_archived ? "opacity-60" : ""}`}>
      <Link href={`/goals/${goal.id}`} className="flex-1 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              {goal.is_archived && (
                <Archive className="h-4 w-4 text-muted-foreground" />
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
          <CardTitle className="text-lg mt-3">{goal.title}</CardTitle>
          {goal.description && (
            <CardDescription className="line-clamp-2">
              {goal.description}
            </CardDescription>
          )}
        </CardHeader>
      </Link>
      <CardContent className="mt-auto pt-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {goal.is_archived && (
              <Badge variant="outline" className="text-muted-foreground">
                Archived
              </Badge>
            )}
            {goal.target_exam && (
              <Badge variant="secondary">{goal.target_exam}</Badge>
            )}
            {goal.target_year && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {goal.target_year}
              </Badge>
            )}
          </div>
          {onArchive && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onArchive();
              }}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
              title={goal.is_archived ? "Unarchive" : "Archive"}
            >
              {goal.is_archived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
