"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionEditor } from "@/components/question-editor";
import { useQuestionStore } from "@/stores/question-store";
import { Question, QuestionType, DifficultyLevel } from "@/types";

// ── Display helpers ──

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_MCQ: "MCQ",
  MULTI_MCQ: "Multi MCQ",
  NUMERICAL: "Numerical",
  TRUE_FALSE: "True/False",
  SUBJECTIVE: "Subjective",
};

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  EASY: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-amber-500/20 dark:text-amber-300",
  HARD: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

interface QuestionListProps {
  subtopicId: string;
  readOnly?: boolean;
  aiHierarchy?: {
    goal?: string;
    subject?: string;
    topic?: string;
    subtopic?: string;
  };
}

export function QuestionList({ subtopicId, readOnly, aiHierarchy }: QuestionListProps) {
  const {
    questions,
    loading,
    error,
    page,
    total,
    totalPages,
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
  } = useQuestionStore();

  const [showEditor, setShowEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchQuestions(subtopicId, 1);
  }, [subtopicId, fetchQuestions]);

  const goToPage = useCallback(
    (p: number) => {
      fetchQuestions(subtopicId, p);
      setCollapsedIds(new Set());
    },
    [subtopicId, fetchQuestions]
  );

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setShowEditor(true);
  };

  const handleEdit = (q: Question) => {
    setEditingQuestion(q);
    setShowEditor(true);
  };

  const handleSave = async (data: Parameters<typeof createQuestion>[1]) => {
    setSaving(true);
    try {
      if (editingQuestion) {
        await updateQuestion(subtopicId, editingQuestion.id, data);
      } else {
        await createQuestion(subtopicId, data);
      }
      setShowEditor(false);
      setEditingQuestion(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    setDeletingId(questionId);
    try {
      await deleteQuestion(subtopicId, questionId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingQuestion(null);
  };

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-20" />
                <div className="flex items-center gap-1.5 ml-auto">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-4 w-10 rounded-full" />
                </div>
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
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  // Show editor full-width, full-height
  if (showEditor) {
    return (
      <div className="w-full h-full flex flex-col">
        <QuestionEditor
          question={editingQuestion || undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
          aiHierarchy={aiHierarchy}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {total} question{total !== 1 ? "s" : ""}
        </h2>
        {!readOnly && (
          <Button size="sm" onClick={handleCreate} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Question
          </Button>
        )}
      </div>

      {/* Question cards */}
      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No questions yet.{!readOnly && ' Click "Add Question" to create one.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={(page - 1) * 10 + idx}
              expanded={!collapsedIds.has(q.id)}
              onToggle={() => toggleCollapse(q.id)}
              onEdit={() => handleEdit(q)}
              onDelete={() => handleDelete(q.id)}
              deleting={deletingId === q.id}
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

// ── Single question card ──

function QuestionCard({
  question: q,
  index,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  deleting,
  readOnly,
}: {
  question: Question;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  readOnly?: boolean;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Reset reveals when collapsing
  useEffect(() => {
    if (!expanded) {
      setShowAnswer(false);
      setShowExplanation(false);
    }
  }, [expanded]);

  const hasAnswer =
    (q.options.length > 0) ||
    (q.question_type === "NUMERICAL" && q.numerical_answer !== null) ||
    (q.question_type === "SUBJECTIVE" && q.answer_html);
  const hasExplanation = !!q.explanation_html;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header — just "Question N" + badges */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        <span className="text-sm font-semibold">
          Question {index + 1}
        </span>

        {/* Badges */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {TYPE_LABELS[q.question_type]}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${DIFFICULTY_STYLES[q.difficulty]}`}
          >
            {q.difficulty}
          </Badge>
          {q.is_pyq && (
            <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-300 dark:border-purple-500/30" variant="outline">
              PYQ
            </Badge>
          )}
          {q.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          <span className="text-[10px] text-muted-foreground">
            {q.marks > 0 && `+${q.marks}`}
            {q.negative_marks > 0 && ` / -${q.negative_marks}`}
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
          {/* Question body */}
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: q.text_html }}
          />

          {/* Options — always show but only highlight correct when revealed */}
          {q.options.length > 0 && (
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <div
                  key={opt.id}
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                    showAnswer && opt.is_correct
                      ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/50"
                      : ""
                  }`}
                >
                  <span
                    className={`shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                      showAnswer && opt.is_correct
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {showAnswer && opt.is_correct ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + i)}
                  </span>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none flex-1"
                    dangerouslySetInnerHTML={{ __html: opt.text_html }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Numerical answer — only when revealed */}
          {showAnswer && q.question_type === "NUMERICAL" && q.numerical_answer !== null && (
            <div className="rounded-lg border border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/50 px-3 py-2">
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                Answer: {q.numerical_answer}
                {q.numerical_tolerance ? ` (± ${q.numerical_tolerance})` : ""}
              </span>
            </div>
          )}

          {/* Subjective answer — only when revealed */}
          {showAnswer && q.question_type === "SUBJECTIVE" && q.answer_html && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Model Answer</span>
              <div
                className="prose prose-sm dark:prose-invert max-w-none rounded-lg border p-3"
                dangerouslySetInnerHTML={{ __html: q.answer_html }}
              />
            </div>
          )}

          {/* Explanation — only when revealed */}
          {showExplanation && q.explanation_html && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Explanation</span>
              <div
                className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-dashed p-3 bg-muted/30"
                dangerouslySetInnerHTML={{ __html: q.explanation_html }}
              />
            </div>
          )}

          {/* Reveal buttons + action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {hasAnswer && (
              <Button
                variant={showAnswer ? "secondary" : "outline"}
                size="xs"
                onClick={() => setShowAnswer(!showAnswer)}
                className="gap-1 text-xs"
              >
                {showAnswer ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                {showAnswer ? "Hide Answer" : "Show Answer"}
              </Button>
            )}
            {hasExplanation && (
              <Button
                variant={showExplanation ? "secondary" : "outline"}
                size="xs"
                onClick={() => setShowExplanation(!showExplanation)}
                className="gap-1 text-xs"
              >
                {showExplanation ? <X className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {showExplanation ? "Hide Explanation" : "Show Explanation"}
              </Button>
            )}

            {/* Spacer */}
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
