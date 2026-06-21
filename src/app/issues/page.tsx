"use client";

import { useEffect, useState } from "react";
import {
  Bug,
  CheckCircle2,
  Circle,
  ExternalLink,
  Sparkles,
  Wrench,
  Gauge,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { AuthGuard } from "@/components/auth-guard";
import { useIssueStore } from "@/stores/issue-store";
import { Issue } from "@/types";

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  bug: { icon: <Bug className="h-3.5 w-3.5" />, label: "Bug", color: "text-red-600 border-red-300 dark:border-red-800" },
  feature: { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Feature", color: "text-violet-600 border-violet-300 dark:border-violet-800" },
  ui: { icon: <Wrench className="h-3.5 w-3.5" />, label: "UI", color: "text-blue-600 border-blue-300 dark:border-blue-800" },
  performance: { icon: <Gauge className="h-3.5 w-3.5" />, label: "Performance", color: "text-amber-600 border-amber-300 dark:border-amber-800" },
  other: { icon: <HelpCircle className="h-3.5 w-3.5" />, label: "Other", color: "text-gray-600 border-gray-300 dark:border-gray-700" },
};

type FilterStatus = "all" | "open" | "resolved";

export default function IssuesPage() {
  return (
    <AuthGuard>
      <IssuesContent />
    </AuthGuard>
  );
}

function IssuesContent() {
  const { issues, loading, fetchIssues, resolveIssue, reopenIssue } = useIssueStore();
  const [filter, setFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const filtered = issues.filter((issue) => {
    if (filter === "open") return issue.status === "open";
    if (filter === "resolved") return issue.status === "resolved";
    return true;
  });

  const openCount = issues.filter((i) => i.status === "open").length;
  const resolvedCount = issues.filter((i) => i.status === "resolved").length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header breadcrumbs={[{ label: "Issues" }]} />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reported Issues</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {openCount} open, {resolvedCount} resolved
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 rounded-lg bg-muted/50 p-1 w-fit">
          {(["all", "open", "resolved"] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === status
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "all" ? `All (${issues.length})` : status === "open" ? `Open (${openCount})` : `Resolved (${resolvedCount})`}
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-4 h-20 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No issues found</h3>
            <p className="text-sm text-muted-foreground">
              {filter === "open" ? "All issues have been resolved!" : "No reported issues yet."}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onResolve={() => resolveIssue(issue.id)}
                onReopen={() => reopenIssue(issue.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function IssueCard({
  issue,
  onResolve,
  onReopen,
}: {
  issue: Issue;
  onResolve: () => void;
  onReopen: () => void;
}) {
  const cat = CATEGORY_CONFIG[issue.category] || CATEGORY_CONFIG.other;
  const isResolved = issue.status === "resolved";
  const createdDate = new Date(issue.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const resolvedDate = issue.resolved_at
    ? new Date(issue.resolved_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={`rounded-lg border bg-card p-4 transition-colors ${
        isResolved ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {isResolved ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-sm font-semibold ${isResolved ? "line-through text-muted-foreground" : ""}`}>
              {issue.title}
            </h3>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cat.color}`}>
              {cat.icon}
              <span className="ml-1">{cat.label}</span>
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {issue.description}
          </p>

          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span>Reported {createdDate}</span>
            {resolvedDate && <span>Resolved {resolvedDate}</span>}
            {issue.page_url && (
              <a
                href={issue.page_url}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Page
              </a>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {isResolved ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={onReopen}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reopen
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white"
              onClick={onResolve}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolve
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
