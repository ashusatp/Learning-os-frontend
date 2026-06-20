"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  LinkIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MistakeEditor } from "@/components/mistake-editor";
import { useMistakeStore } from "@/stores/mistake-store";
import { Mistake, MistakeType, Question } from "@/types";

const TYPE_LABELS: Record<MistakeType, string> = {
  CONCEPTUAL: "Conceptual",
  SILLY: "Silly",
  CALCULATION: "Calculation",
  MISREAD: "Misread",
  TIME_PRESSURE: "Time Pressure",
  OTHER: "Other",
};

const TYPE_STYLES: Record<MistakeType, string> = {
  CONCEPTUAL: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  SILLY: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  CALCULATION: "bg-yellow-100 text-yellow-700 dark:bg-amber-500/20 dark:text-amber-300",
  MISREAD: "bg-blue-100 text-blue-700 dark:bg-sky-500/20 dark:text-sky-300",
  TIME_PRESSURE: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  OTHER: "bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300",
};

interface MistakeListProps {
  subtopicId: string;
  readOnly?: boolean;
  questions?: Question[];
}

export function MistakeList({ subtopicId, readOnly, questions }: MistakeListProps) {
  const {
    mistakes,
    loading,
    error,
    page,
    total,
    totalPages,
    fetchMistakes,
    createMistake,
    updateMistake,
    resolveMistake,
    deleteMistake,
  } = useMistakeStore();

  const [showEditor, setShowEditor] = useState(false);
  const [editingMistake, setEditingMistake] = useState<Mistake | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("all");

  useEffect(() => {
    const resolved = filter === "all" ? null : filter === "resolved";
    fetchMistakes(subtopicId, resolved, 1);
  }, [subtopicId, filter, fetchMistakes]);

  const goToPage = useCallback(
    (p: number) => {
      const resolved = filter === "all" ? null : filter === "resolved";
      fetchMistakes(subtopicId, resolved, p);
      setExpandedId(null);
    },
    [subtopicId, filter, fetchMistakes]
  );

  const handleCreate = () => {
    setEditingMistake(null);
    setShowEditor(true);
  };

  const handleEdit = (m: Mistake) => {
    setEditingMistake(m);
    setShowEditor(true);
  };

  const handleSave = async (data: Parameters<typeof createMistake>[1]) => {
    setSaving(true);
    try {
      if (editingMistake) {
        await updateMistake(subtopicId, editingMistake.id, data);
      } else {
        await createMistake(subtopicId, data);
      }
      setShowEditor(false);
      setEditingMistake(null);
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (mistakeId: string) => {
    setResolvingId(mistakeId);
    try {
      await resolveMistake(subtopicId, mistakeId);
    } finally {
      setResolvingId(null);
    }
  };

  const handleDelete = async (mistakeId: string) => {
    setDeletingId(mistakeId);
    try {
      await deleteMistake(subtopicId, mistakeId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingMistake(null);
  };

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-5 w-18 rounded" />
            </div>
          </div>
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16 rounded-full shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive gap-2">
        <AlertTriangle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  if (showEditor) {
    return (
      <div className="w-full">
        <MistakeEditor
          mistake={editingMistake || undefined}
          questions={questions}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {total} mistake{total !== 1 ? "s" : ""}
          </h2>
          {/* Filter pills */}
          <div className="flex items-center gap-1">
            {(["all", "unresolved", "resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                  filter === f
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={handleCreate} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Log Mistake
          </Button>
        )}
      </div>

      {/* Mistake cards */}
      {mistakes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No mistakes logged.{!readOnly && ' Click "Log Mistake" to add one.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mistakes.map((m) => (
            <MistakeCard
              key={m.id}
              mistake={m}
              expanded={expandedId === m.id}
              onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
              onEdit={() => handleEdit(m)}
              onDelete={() => handleDelete(m.id)}
              onResolve={() => handleResolve(m.id)}
              deleting={deletingId === m.id}
              resolving={resolvingId === m.id}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="xs"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="xs"
                onClick={() => goToPage(p)}
                className="w-7 h-7 p-0 text-xs"
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="xs"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MistakeCard({
  mistake: m,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onResolve,
  deleting,
  resolving,
  readOnly,
}: {
  mistake: Mistake;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResolve: () => void;
  deleting: boolean;
  resolving: boolean;
  readOnly?: boolean;
}) {
  const [showCorrection, setShowCorrection] = useState(false);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        {/* Resolved indicator */}
        {m.is_resolved ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-red-400 shrink-0" />
        )}

        {/* Preview text */}
        <span
          className="flex-1 text-sm truncate"
          dangerouslySetInnerHTML={{
            __html: m.description_html.replace(/<[^>]+>/g, "").slice(0, 120) || "Untitled mistake",
          }}
        />

        {/* Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${TYPE_STYLES[m.mistake_type]}`}
          >
            {TYPE_LABELS[m.mistake_type]}
          </Badge>
          {m.question_id && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
              <LinkIcon className="h-2.5 w-2.5" />
              Q
            </Badge>
          )}
          {m.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          <span className="text-[10px] text-muted-foreground">
            {new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Description */}
          <div>
            <span className="text-xs font-medium text-muted-foreground">What went wrong</span>
            <div
              className="prose prose-sm dark:prose-invert max-w-none mt-1"
              dangerouslySetInnerHTML={{ __html: m.description_html }}
            />
          </div>

          {/* Correction — toggled */}
          {m.correction_html && showCorrection && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">Correct approach</span>
              <div
                className="prose prose-sm dark:prose-invert max-w-none mt-1 rounded-lg border border-dashed p-3 bg-green-50/50 dark:bg-green-950/20"
                dangerouslySetInnerHTML={{ __html: m.correction_html }}
              />
            </div>
          )}

          {/* Resolved info */}
          {m.is_resolved && m.resolved_at && (
            <p className="text-[10px] text-green-600 dark:text-green-400">
              Resolved on {new Date(m.resolved_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {m.correction_html && (
              <Button
                variant={showCorrection ? "secondary" : "outline"}
                size="xs"
                onClick={() => setShowCorrection(!showCorrection)}
                className="gap-1 text-xs"
              >
                {showCorrection ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showCorrection ? "Hide Correction" : "Show Correction"}
              </Button>
            )}
            {!readOnly && (
              <Button
                variant={m.is_resolved ? "secondary" : "outline"}
                size="xs"
                onClick={onResolve}
                disabled={resolving}
                className="gap-1 text-xs"
              >
                {resolving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : m.is_resolved ? (
                  <Circle className="h-3 w-3" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {m.is_resolved ? "Unresolve" : "Resolve"}
              </Button>
            )}

            {!readOnly && <div className="flex-1" />}

            {!readOnly && (
              <>
                <Button variant="outline" size="xs" onClick={onEdit} className="gap-1">
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={onDelete}
                  disabled={deleting}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
