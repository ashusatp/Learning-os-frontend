"use client";

import Link from "next/link";
import {
  BookMarked,
  ArrowRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Subject } from "@/types";

interface SubjectCardProps {
  subject: Subject;
  goalId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
}

export function SubjectCard({ subject, goalId, onEdit, onDelete, onArchive }: SubjectCardProps) {
  const hasMenu = onEdit || onDelete || onArchive;

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border bg-card px-4 py-3.5 transition-all hover:shadow-sm hover:border-primary/30 ${subject.is_archived ? "opacity-60" : ""}`}
    >
      <Link
        href={`/goals/${goalId}/subjects/${subject.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookMarked className="h-4.5 w-4.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{subject.name}</h3>
            {subject.is_archived && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground shrink-0">
                Archived
              </Badge>
            )}
          </div>
          {subject.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {subject.description}
            </p>
          )}
        </div>

        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
      </Link>

      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
            )}
            {onArchive && (
              <DropdownMenuItem onClick={onArchive}>
                {subject.is_archived ? (
                  <ArchiveRestore className="h-3.5 w-3.5" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
                {subject.is_archived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
