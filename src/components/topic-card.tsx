"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Topic } from "@/types";

interface TopicCardProps {
  topic: Topic;
  goalId: string;
  subjectId: string;
}

export function TopicCard({ topic, goalId, subjectId }: TopicCardProps) {
  return (
    <Link
      href={`/goals/${goalId}/subjects/${subjectId}/topics/${topic.id}`}
      className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
        {topic.order ?? "#"}
      </span>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm">{topic.name}</h3>
        {topic.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {topic.description}
          </p>
        )}
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 mt-0.5" />
    </Link>
  );
}
