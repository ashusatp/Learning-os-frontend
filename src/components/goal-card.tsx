"use client";

import Link from "next/link";
import { Target, Calendar, ArrowRight } from "lucide-react";
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
}

export function GoalCard({ goal }: GoalCardProps) {
  return (
    <Link href={`/goals/${goal.id}`}>
      <Card className="group flex flex-col h-full transition-all hover:shadow-lg hover:border-primary/30 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <CardTitle className="text-lg mt-3">{goal.title}</CardTitle>
          {goal.description && (
            <CardDescription className="line-clamp-2">
              {goal.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="mt-auto pt-0">
          <div className="flex flex-wrap gap-2">
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
        </CardContent>
      </Card>
    </Link>
  );
}
