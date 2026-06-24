"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookMarked, CalendarCheck, Archive } from "lucide-react";
import { Header, BreadcrumbEntry } from "@/components/header";
import { Button } from "@/components/ui/button";
import { SubjectCard } from "@/components/subject-card";
import { CreateDialog, FieldConfig } from "@/components/create-dialog";
import { EditDialog } from "@/components/edit-dialog";
import { SubjectListSkeleton } from "@/components/page-skeleton";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/stores/auth-store";
import { useGoalStore } from "@/stores/goal-store";
import { useSubjectStore } from "@/stores/subject-store";
import { LogMistakeDialog } from "@/components/log-mistake-dialog";
import { Subject } from "@/types";

const subjectFields: FieldConfig[] = [
  {
    name: "name",
    label: "Name",
    type: "text",
    placeholder: "e.g., Operating Systems",
    required: true,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Describe this subject...",
  },
];

export default function GoalDetailPage() {
  return (
    <AuthGuard>
      <GoalDetailContent />
    </AuthGuard>
  );
}

function GoalDetailContent() {
  const params = useParams<{ goalId: string }>();
  const goalId = params.goalId;

  const { user } = useAuthStore();
  const { activeGoal, goals, setActiveGoal, fetchGoals } = useGoalStore();
  const { subjects, loading, error, fetchSubjects, createSubject, updateSubject, deleteSubject, archiveSubject } =
    useSubjectStore();
  const [showArchived, setShowArchived] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (user && goals.length === 0) {
      fetchGoals(user.id);
    }
  }, [user, goals.length, fetchGoals]);

  useEffect(() => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) setActiveGoal(goal);
  }, [goals, goalId, setActiveGoal]);

  useEffect(() => {
    if (goalId) fetchSubjects(goalId, showArchived);
  }, [goalId, fetchSubjects, showArchived]);

  const handleCreateSubject = async (
    data: Record<string, string | number>
  ) => {
    await createSubject(goalId, data);
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setEditOpen(true);
  };

  const handleSaveEditSubject = async (data: Record<string, string | number>) => {
    if (editingSubject) {
      await updateSubject(editingSubject.id, data);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    await deleteSubject(subjectId);
  };

  const breadcrumbs: BreadcrumbEntry[] = [
    { label: activeGoal?.title || "Goal" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header breadcrumbs={breadcrumbs} />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {activeGoal?.title || "Goal"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {activeGoal?.description || "Subjects in this goal"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? "secondary" : "outline"}
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowArchived((v) => !v)}
            >
              <Archive className="h-3.5 w-3.5" />
              {showArchived ? "Hide Archived" : "Show Archived"}
            </Button>
            <Link href={`/goals/${goalId}/revisions`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <CalendarCheck className="h-4 w-4" />
                Revisions
              </Button>
            </Link>
            <LogMistakeDialog goalId={goalId} goalTitle={activeGoal?.title} />
            <CreateDialog
              title="Subject"
              description="Add a new subject to this goal."
              fields={subjectFields}
              onSubmit={handleCreateSubject}
            />
          </div>
        </div>

        {loading && <SubjectListSkeleton count={4} />}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive animate-fade-in-up">
            {error}
          </div>
        )}

        {!loading && !error && (() => {
          const filtered = showArchived
            ? subjects.filter((s) => s.is_archived)
            : subjects.filter((s) => !s.is_archived);
          return filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                {showArchived ? (
                  <Archive className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <BookMarked className="h-8 w-8 text-primary" />
                )}
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {showArchived ? "No archived subjects" : "No subjects yet"}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-sm">
                {showArchived
                  ? "Archived subjects will appear here."
                  : "Add subjects to organize your learning material for this goal."}
              </p>
            </div>
          ) : null;
        })()}

        {!loading && (() => {
          const filtered = showArchived
            ? subjects.filter((s) => s.is_archived)
            : subjects.filter((s) => !s.is_archived);
          return filtered.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((subject, i) => (
                <div
                  key={subject.id}
                  className="animate-card-enter"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <SubjectCard
                    subject={subject}
                    goalId={goalId}
                    onEdit={() => handleEditSubject(subject)}
                    onDelete={() => handleDeleteSubject(subject.id)}
                    onArchive={() => archiveSubject(subject.id, !subject.is_archived)}
                  />
                </div>
              ))}
            </div>
          ) : null;
        })()}
      </main>

      {editingSubject && (
        <EditDialog
          title="Subject"
          description="Update this subject's details."
          fields={subjectFields}
          initialData={{
            name: editingSubject.name,
            description: editingSubject.description,
          }}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSubmit={handleSaveEditSubject}
        />
      )}
    </div>
  );
}
