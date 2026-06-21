"use client";

import Link from "next/link";
import { BookMarked, ArrowRight, Archive, ArchiveRestore } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Subject } from "@/types";

interface SubjectCardProps {
  subject: Subject;
  goalId: string;
  onArchive?: () => void;
}

export function SubjectCard({ subject, goalId, onArchive }: SubjectCardProps) {
  return (
    <div
      className={`group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30 ${subject.is_archived ? "opacity-60" : ""}`}
    >
      <Link
        href={`/goals/${goalId}/subjects/${subject.id}`}
        className="flex items-center gap-4 flex-1 min-w-0"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookMarked className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{subject.name}</h3>
            {subject.is_archived && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground shrink-0">
                Archived
              </Badge>
            )}
          </div>
          {subject.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {subject.description}
            </p>
          )}
        </div>

        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
      </Link>

      {onArchive && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onArchive();
          }}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
          title={subject.is_archived ? "Unarchive" : "Archive"}
        >
          {subject.is_archived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}
