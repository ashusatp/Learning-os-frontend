"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Puzzle } from "lucide-react";
import { Header, BreadcrumbEntry } from "@/components/header";
import { SubTopicCard } from "@/components/subtopic-card";
import { CreateDialog, FieldConfig } from "@/components/create-dialog";
import { SubtopicGridSkeleton } from "@/components/page-skeleton";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/stores/auth-store";
import { useGoalStore } from "@/stores/goal-store";
import { useSubjectStore } from "@/stores/subject-store";
import { useTopicStore } from "@/stores/topic-store";
import { useSubTopicStore } from "@/stores/subtopic-store";

const subtopicFields: FieldConfig[] = [
  {
    name: "name",
    label: "Name",
    type: "text",
    placeholder: "e.g., Deadlock Prevention",
    required: true,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Describe this subtopic...",
  },
];

export default function TopicDetailPage() {
  return (
    <AuthGuard>
      <TopicDetailContent />
    </AuthGuard>
  );
}

function TopicDetailContent() {
  const params = useParams<{
    goalId: string;
    subjectId: string;
    topicId: string;
  }>();
  const { goalId, subjectId, topicId } = params;

  const { user } = useAuthStore();
  const { activeGoal, goals, setActiveGoal, fetchGoals } = useGoalStore();
  const { activeSubject, subjects, setActiveSubject, fetchSubjects } =
    useSubjectStore();
  const { activeTopic, topics, setActiveTopic, fetchTopics } =
    useTopicStore();
  const { subtopics, loading, error, fetchSubTopics, createSubTopic } =
    useSubTopicStore();

  useEffect(() => {
    if (user && goals.length === 0) fetchGoals(user.id);
  }, [user, goals.length, fetchGoals]);

  useEffect(() => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) setActiveGoal(goal);
  }, [goals, goalId, setActiveGoal]);

  useEffect(() => {
    if (subjects.length === 0) fetchSubjects(goalId);
  }, [subjects.length, goalId, fetchSubjects]);

  useEffect(() => {
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject) setActiveSubject(subject);
  }, [subjects, subjectId, setActiveSubject]);

  useEffect(() => {
    if (topics.length === 0) fetchTopics(subjectId);
  }, [topics.length, subjectId, fetchTopics]);

  useEffect(() => {
    const topic = topics.find((t) => t.id === topicId);
    if (topic) setActiveTopic(topic);
  }, [topics, topicId, setActiveTopic]);

  useEffect(() => {
    if (topicId) fetchSubTopics(topicId);
  }, [topicId, fetchSubTopics]);

  const handleCreateSubTopic = async (
    data: Record<string, string | number>
  ) => {
    await createSubTopic(topicId, data);
  };

  const breadcrumbs: BreadcrumbEntry[] = [
    { label: activeGoal?.title || "Goal", href: `/goals/${goalId}` },
    {
      label: activeSubject?.name || "Subject",
      href: `/goals/${goalId}/subjects/${subjectId}`,
    },
    { label: activeTopic?.name || "Topic" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header breadcrumbs={breadcrumbs} />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {activeTopic?.name || "Subtopics"}
            </h1>
            {activeTopic?.description && (
              <p className="text-muted-foreground mt-1">
                {activeTopic.description}
              </p>
            )}
          </div>
          <CreateDialog
            title="Subtopic"
            description="Add a new subtopic to track your learning progress."
            fields={subtopicFields}
            onSubmit={handleCreateSubTopic}
          />
        </div>

        {loading && <SubtopicGridSkeleton count={3} />}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive animate-fade-in-up">
            {error}
          </div>
        )}

        {!loading && !error && subtopics.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Puzzle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No subtopics yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Add subtopics to track mastery, revisions, and performance at a
              granular level.
            </p>
          </div>
        )}

        {!loading && subtopics.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {subtopics.map((subtopic, i) => (
              <div
                key={subtopic.id}
                className="animate-card-enter"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <SubTopicCard subtopic={subtopic} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
