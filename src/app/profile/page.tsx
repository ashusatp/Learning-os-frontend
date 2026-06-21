"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Target,
  BookOpen,
  Layers,
  FileText,
  Flame,
  Trophy,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Shield,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/header";
import { AuthGuard } from "@/components/auth-guard";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { useAuthStore } from "@/stores/auth-store";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import api from "@/lib/api";

interface ProfileStats {
  goal_count: number;
  subject_count: number;
  topic_count: number;
  subtopic_count: number;
  mastery_distribution: Record<string, number>;
  total_revisions: number;
  active_schedules: number;
  avg_confidence: number;
  daily_streak: number;
  longest_streak: number;
  streak_freezes: number;
}

const MASTERY_COLORS: Record<string, { bar: string; label: string }> = {
  NOT_STARTED: { bar: "bg-gray-400", label: "Not Started" },
  BEGINNER: { bar: "bg-orange-400", label: "Beginner" },
  INTERMEDIATE: { bar: "bg-amber-500", label: "Intermediate" },
  ADVANCED: { bar: "bg-sky-500", label: "Advanced" },
  MASTERED: { bar: "bg-green-500", label: "Mastered" },
};

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ProfileStats>("/profile/stats");
      setStats(res.data);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Header breadcrumbs={[{ label: "Profile" }]} />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          {/* GitHub/LeetCode layout: left sidebar + right content */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* ── Left sidebar: profile info ── */}
            <div className="w-full lg:w-[280px] shrink-0">
              <div className="lg:sticky lg:top-20 space-y-5">
                {/* Avatar + name */}
                <div className="flex flex-row lg:flex-col items-center lg:items-start gap-4">
                  <div className="flex h-20 w-20 lg:h-[200px] lg:w-[200px] items-center justify-center rounded-full bg-primary text-2xl lg:text-5xl font-bold text-primary-foreground shrink-0 lg:mx-auto">
                    {initials}
                  </div>
                  <div className="flex-1 lg:w-full">
                    <h1 className="text-xl lg:text-2xl font-bold tracking-tight">{user?.name}</h1>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Joined {joinDate}</span>
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                {stats && (
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat icon={<Target className="h-3.5 w-3.5 text-violet-500" />} label="Goals" value={stats.goal_count} />
                    <MiniStat icon={<BookOpen className="h-3.5 w-3.5 text-blue-500" />} label="Subjects" value={stats.subject_count} />
                    <MiniStat icon={<Layers className="h-3.5 w-3.5 text-amber-500" />} label="Topics" value={stats.topic_count} />
                    <MiniStat icon={<FileText className="h-3.5 w-3.5 text-green-500" />} label="Subtopics" value={stats.subtopic_count} />
                  </div>
                )}

                {/* Streak */}
                {stats && (
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Streak</span>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-500">{stats.daily_streak}d</div>
                        <div className="text-[10px] text-muted-foreground">Current</div>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <div className="text-2xl font-bold">{stats.longest_streak}d</div>
                        <div className="text-[10px] text-muted-foreground">Best</div>
                      </div>
                    </div>
                    {stats.streak_freezes > 0 && (
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t text-[11px] text-muted-foreground">
                        <Shield className="h-3 w-3 text-blue-500" />
                        {stats.streak_freezes} freeze{stats.streak_freezes !== 1 ? "s" : ""} left
                      </div>
                    )}
                  </div>
                )}

                {/* Revision & confidence stats */}
                {stats && (
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs">Revisions Done</span>
                      </div>
                      <span className="text-sm font-semibold">{stats.total_revisions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
                        <span className="text-xs">Active Schedules</span>
                      </div>
                      <span className="text-sm font-semibold">{stats.active_schedules}</span>
                    </div>
                    {stats.subtopic_count > 0 && (
                      <>
                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <Trophy className="h-3.5 w-3.5 text-amber-500" />
                              <span className="text-xs">Avg Confidence</span>
                            </div>
                            <span className="text-sm font-semibold">{stats.avg_confidence}%</span>
                          </div>
                          <Progress value={stats.avg_confidence} className="h-1.5" />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right content: heatmap + mastery ── */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Activity heatmap — full width */}
              <ActivityHeatmap />

              {/* Mastery distribution */}
              {stats && stats.subtopic_count > 0 && (
                <div className="rounded-lg border bg-card p-5">
                  <h3 className="text-sm font-medium mb-4">Mastery Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(MASTERY_COLORS).map(([level, style]) => {
                      const count = stats.mastery_distribution[level] || 0;
                      const pct = stats.subtopic_count > 0
                        ? Math.round((count / stats.subtopic_count) * 100)
                        : 0;
                      return (
                        <div key={level}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs">{style.label}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${style.bar} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border bg-card p-4 h-32 animate-pulse" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}
