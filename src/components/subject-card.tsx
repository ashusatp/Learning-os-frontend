"use client";

import Link from "next/link";
import { BookMarked, ArrowRight } from "lucide-react";
import { Subject } from "@/types";

interface SubjectCardProps {
  subject: Subject;
  goalId: string;
}

export function SubjectCard({ subject, goalId }: SubjectCardProps) {
  return (
    <Link
      href={`/goals/${goalId}/subjects/${subject.id}`}
      className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <BookMarked className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm truncate">{subject.name}</h3>
        {subject.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {subject.description}
          </p>
        )}
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
    </Link>
  );
}
