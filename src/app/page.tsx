"use client";

import { useEffect } from "react";
import { Target } from "lucide-react";
import { Header } from "@/components/header";
import { GoalCard } from "@/components/goal-card";
import { CreateDialog, FieldConfig } from "@/components/create-dialog";
import { CardGridSkeleton } from "@/components/page-skeleton";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/stores/auth-store";
import { useGoalStore } from "@/stores/goal-store";

const goalFields: FieldConfig[] = [
  {
    name: "title",
    label: "Title",
    type: "text",
    placeholder: "e.g., GATE 2027",
    required: true,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Describe your learning goal...",
  },
  {
    name: "target_exam",
    label: "Target Exam",
    type: "text",
    placeholder: "e.g., GATE, UPSC, JEE",
  },
  {
    name: "target_year",
    label: "Target Year",
    type: "number",
    placeholder: "e.g., 2027",
  },
];

export default function HomePage() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  );
}

function HomeContent() {
  const { user } = useAuthStore();
  const { goals, loading, error, fetchGoals, createGoal } = useGoalStore();

  useEffect(() => {
    if (user) {
      fetchGoals(user.id);
    }
  }, [user, fetchGoals]);

  const handleCreateGoal = async (data: Record<string, string | number>) => {
    if (user) {
      await createGoal(user.id, data);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Goals</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your learning objectives
            </p>
          </div>
          <CreateDialog
            title="Goal"
            description="Create a new learning goal to start organizing your study plan."
            fields={goalFields}
            onSubmit={handleCreateGoal}
          />
        </div>

        {loading && <CardGridSkeleton count={3} cardHeight="h-48" />}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive animate-fade-in-up">
            {error}
          </div>
        )}

        {!loading && !error && goals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No goals yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first learning goal to start organizing subjects, topics, and tracking progress.
            </p>
          </div>
        )}

        {!loading && goals.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal, i) => (
              <div
                key={goal.id}
                className="animate-card-enter"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <GoalCard goal={goal} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
