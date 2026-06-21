"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Target, Clock, AlertTriangle, Flame, ArrowRight } from "lucide-react";
import { Header } from "@/components/header";
import { GoalCard } from "@/components/goal-card";
import { CreateDialog, FieldConfig } from "@/components/create-dialog";
import { CardGridSkeleton } from "@/components/page-skeleton";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/stores/auth-store";
import { useGoalStore } from "@/stores/goal-store";
import { useRevisionStore } from "@/stores/revision-store";

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
  const { stats, overdue, dueToday, fetchGlobalQueue } = useRevisionStore();

  useEffect(() => {
    if (user) {
      fetchGoals(user.id);
      fetchGlobalQueue();
    }
  }, [user, fetchGoals, fetchGlobalQueue]);

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

        {/* Revision summary banner */}
        {stats && (overdue.length > 0 || dueToday.length > 0) && (
          <Link href="/revisions">
            <div className="group mb-8 rounded-lg border bg-card px-4 py-3 flex items-center gap-4 hover:border-primary/30 hover:shadow-sm transition-all animate-fade-in-up cursor-pointer">
              {overdue.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {overdue.length} overdue
                  </span>
                </div>
              )}
              {dueToday.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-4 w-4 text-violet-500" />
                  <span className="font-medium">
                    {dueToday.length} due today
                  </span>
                </div>
              )}
              {stats.daily_streak > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{stats.daily_streak}d streak</span>
                </div>
              )}
              <div className="flex-1" />
              <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Open Revisions
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        )}

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
