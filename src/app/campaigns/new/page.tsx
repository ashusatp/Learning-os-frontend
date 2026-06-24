"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  Search,
  X,
  ArrowRight,
  Calendar,
  BookOpen,
  AlertTriangle,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Header } from "@/components/header";
import { AuthGuard } from "@/components/auth-guard";
import { useCampaignStore } from "@/stores/campaign-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  Goal,
  Subject,
  Topic,
  CampaignType,
  CampaignPreview,
  PreviewDay,
  SubjectSummary,
} from "@/types";
import { toast } from "sonner";
import api from "@/lib/api";

const CAMPAIGN_TYPE_LABELS: Record<
  CampaignType,
  { label: string; icon: React.ReactNode }
> = {
  SUBTOPIC_REVISION: {
    label: "Subtopic Revision",
    icon: <BookOpen className="h-4 w-4" />,
  },
  MISTAKE_REVIEW: {
    label: "Mistake Review",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  PYQ_PRACTICE: {
    label: "PYQ Practice",
    icon: <Target className="h-4 w-4" />,
  },
};

export default function NewCampaignPage() {
  return (
    <AuthGuard>
      <NewCampaignContent />
    </AuthGuard>
  );
}

function NewCampaignContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createCampaign, fetchPreview, preview, previewLoading, clearPreview } =
    useCampaignStore();

  // Step: "config" | "preview"
  const [step, setStep] = useState<"config" | "preview">("config");
  const [submitting, setSubmitting] = useState(false);

  // Config state
  const [name, setName] = useState("");
  const [campaignType, setCampaignType] =
    useState<CampaignType>("SUBTOPIC_REVISION");
  const [totalDays, setTotalDays] = useState("30");
  const [parallelSubjects, setParallelSubjects] = useState("2");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Scope state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topicsBySubject, setTopicsBySubject] = useState<
    Record<string, Topic[]>
  >({});
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set()
  );
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(
    new Set()
  );
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(
    new Set()
  );
  const [loadingTopics, setLoadingTopics] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Subject order for reordering in preview
  const [subjectOrder, setSubjectOrder] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      api
        .get<Goal[]>(`/users/${user.id}/goals`)
        .then((res) => setGoals(res.data.filter((g) => !g.is_archived)));
    }
  }, [user]);

  useEffect(() => {
    if (!selectedGoalId) {
      setSubjects([]);
      return;
    }
    api.get<Subject[]>(`/goals/${selectedGoalId}/subjects`).then((res) => {
      setSubjects(res.data.filter((s) => !s.is_archived));
    });
    setSelectedSubjects(new Set());
    setSelectedTopics(new Set());
    setExpandedSubjects(new Set());
    setTopicsBySubject({});
    setSearchQuery("");
  }, [selectedGoalId]);

  useEffect(() => {
    return () => clearPreview();
  }, [clearPreview]);

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const q = searchQuery.toLowerCase();
    return subjects.filter((s) => {
      if (s.name.toLowerCase().includes(q)) return true;
      const topics = topicsBySubject[s.id] || [];
      return topics.some((t) => t.name.toLowerCase().includes(q));
    });
  }, [subjects, searchQuery, topicsBySubject]);

  const toggleExpand = useCallback(
    (subjectId: string) => {
      setExpandedSubjects((prev) => {
        const next = new Set(prev);
        if (next.has(subjectId)) {
          next.delete(subjectId);
        } else {
          next.add(subjectId);
          if (!topicsBySubject[subjectId]) {
            setLoadingTopics((p) => new Set(p).add(subjectId));
            api
              .get<Topic[]>(`/subjects/${subjectId}/topics`)
              .then((res) => {
                setTopicsBySubject((prev) => ({
                  ...prev,
                  [subjectId]: res.data.filter((t) => !t.is_archived),
                }));
                setLoadingTopics((p) => {
                  const n = new Set(p);
                  n.delete(subjectId);
                  return n;
                });
              });
          }
        }
        return next;
      });
    },
    [topicsBySubject]
  );

  const allSelected =
    subjects.length > 0 &&
    subjects.every((s) => selectedSubjects.has(s.id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedSubjects(new Set());
      setSelectedTopics(new Set());
    } else {
      setSelectedSubjects(new Set(subjects.map((s) => s.id)));
      setSelectedTopics(new Set());
    }
  }, [allSelected, subjects]);

  const toggleSubject = useCallback(
    (subjectId: string) => {
      setSelectedSubjects((prev) => {
        const next = new Set(prev);
        if (next.has(subjectId)) {
          next.delete(subjectId);
        } else {
          next.add(subjectId);
        }
        const topics = topicsBySubject[subjectId] || [];
        setSelectedTopics((pt) => {
          const nt = new Set(pt);
          topics.forEach((t) => nt.delete(t.id));
          return nt;
        });
        return next;
      });
    },
    [topicsBySubject]
  );

  const toggleTopic = useCallback(
    (topicId: string, subjectId: string) => {
      if (selectedSubjects.has(subjectId)) {
        const topics = topicsBySubject[subjectId] || [];
        setSelectedSubjects((prev) => {
          const next = new Set(prev);
          next.delete(subjectId);
          return next;
        });
        setSelectedTopics((prev) => {
          const next = new Set(prev);
          topics.forEach((t) => {
            if (t.id !== topicId) next.add(t.id);
          });
          return next;
        });
        return;
      }
      setSelectedTopics((prev) => {
        const next = new Set(prev);
        if (next.has(topicId)) next.delete(topicId);
        else next.add(topicId);
        const topics = topicsBySubject[subjectId] || [];
        if (topics.length > 0 && topics.every((t) => next.has(t.id))) {
          setSelectedSubjects((ps) => new Set(ps).add(subjectId));
          topics.forEach((t) => next.delete(t.id));
        }
        return next;
      });
    },
    [selectedSubjects, topicsBySubject]
  );

  const buildScopes = () => {
    const scopes: {
      scope_type: string;
      subject_id: string;
      topic_id?: string | null;
    }[] = [];
    for (const subjectId of selectedSubjects) {
      scopes.push({ scope_type: "SUBJECT", subject_id: subjectId });
    }
    for (const topicId of selectedTopics) {
      for (const [subjectId, topics] of Object.entries(topicsBySubject)) {
        if (topics.some((t) => t.id === topicId)) {
          scopes.push({
            scope_type: "TOPIC",
            subject_id: subjectId,
            topic_id: topicId,
          });
          break;
        }
      }
    }
    return scopes;
  };

  const hasSelection = selectedSubjects.size > 0 || selectedTopics.size > 0;

  const handlePreview = async () => {
    const scopes = buildScopes();
    if (!scopes.length) {
      toast.error("Select at least one subject or topic");
      return;
    }
    try {
      const result = await fetchPreview({
        campaign_type: campaignType,
        total_days: Number(totalDays),
        parallel_subjects: Number(parallelSubjects),
        start_date: startDate,
        scopes,
        subject_order: subjectOrder.length > 0 ? subjectOrder : undefined,
      });
      setSubjectOrder(result.subjects.map((s) => s.subject_id));
      setStep("preview");
    } catch {
      toast.error("Failed to generate preview");
    }
  };

  const handleReorderAndRefresh = async (newOrder: string[]) => {
    setSubjectOrder(newOrder);
    const scopes = buildScopes();
    try {
      const result = await fetchPreview({
        campaign_type: campaignType,
        total_days: Number(totalDays),
        parallel_subjects: Number(parallelSubjects),
        start_date: startDate,
        scopes,
        subject_order: newOrder,
      });
      setSubjectOrder(result.subjects.map((s) => s.subject_id));
    } catch {
      toast.error("Failed to refresh preview");
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Enter a campaign name");
      return;
    }
    setSubmitting(true);
    try {
      await createCampaign({
        name,
        campaign_type: campaignType,
        total_days: Number(totalDays),
        parallel_subjects: Number(parallelSubjects),
        start_date: startDate,
        scopes: buildScopes(),
        subject_order: subjectOrder.length > 0 ? subjectOrder : undefined,
      });
      toast.success("Campaign created!");
      router.push("/campaigns");
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        breadcrumbs={[
          { label: "Campaigns", href: "/campaigns" },
          { label: step === "config" ? "New Campaign" : "Preview" },
        ]}
      />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {step === "config" ? (
          <ConfigStep
            name={name}
            setName={setName}
            campaignType={campaignType}
            setCampaignType={setCampaignType}
            totalDays={totalDays}
            setTotalDays={setTotalDays}
            parallelSubjects={parallelSubjects}
            setParallelSubjects={setParallelSubjects}
            startDate={startDate}
            setStartDate={setStartDate}
            goals={goals}
            selectedGoalId={selectedGoalId}
            setSelectedGoalId={setSelectedGoalId}
            subjects={subjects}
            filteredSubjects={filteredSubjects}
            topicsBySubject={topicsBySubject}
            expandedSubjects={expandedSubjects}
            selectedSubjects={selectedSubjects}
            selectedTopics={selectedTopics}
            loadingTopics={loadingTopics}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            allSelected={allSelected}
            toggleAll={toggleAll}
            toggleExpand={toggleExpand}
            toggleSubject={toggleSubject}
            toggleTopic={toggleTopic}
            hasSelection={hasSelection}
            onPreview={handlePreview}
            previewLoading={previewLoading}
          />
        ) : (
          <PreviewStep
            name={name}
            setName={setName}
            preview={preview}
            subjectOrder={subjectOrder}
            onReorder={handleReorderAndRefresh}
            onBack={() => setStep("config")}
            onCreate={handleCreate}
            submitting={submitting}
            previewLoading={previewLoading}
          />
        )}
      </main>
    </div>
  );
}

// ── Config Step ──

function ConfigStep({
  name,
  setName,
  campaignType,
  setCampaignType,
  totalDays,
  setTotalDays,
  parallelSubjects,
  setParallelSubjects,
  startDate,
  setStartDate,
  goals,
  selectedGoalId,
  setSelectedGoalId,
  subjects,
  filteredSubjects,
  topicsBySubject,
  expandedSubjects,
  selectedSubjects,
  selectedTopics,
  loadingTopics,
  searchQuery,
  setSearchQuery,
  allSelected,
  toggleAll,
  toggleExpand,
  toggleSubject,
  toggleTopic,
  hasSelection,
  onPreview,
  previewLoading,
}: {
  name: string;
  setName: (v: string) => void;
  campaignType: CampaignType;
  setCampaignType: (v: CampaignType) => void;
  totalDays: string;
  setTotalDays: (v: string) => void;
  parallelSubjects: string;
  setParallelSubjects: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  goals: Goal[];
  selectedGoalId: string;
  setSelectedGoalId: (v: string) => void;
  subjects: Subject[];
  filteredSubjects: Subject[];
  topicsBySubject: Record<string, Topic[]>;
  expandedSubjects: Set<string>;
  selectedSubjects: Set<string>;
  selectedTopics: Set<string>;
  loadingTopics: Set<string>;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  allSelected: boolean;
  toggleAll: () => void;
  toggleExpand: (id: string) => void;
  toggleSubject: (id: string) => void;
  toggleTopic: (id: string, sid: string) => void;
  hasSelection: boolean;
  onPreview: () => void;
  previewLoading: boolean;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1">
        Create Revision Campaign
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Select what to revise, set the pace, and preview the schedule
      </p>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Left: scope selection */}
        <div className="space-y-4">
          {/* Goal */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Goal</Label>
            <Select
              value={selectedGoalId}
              onValueChange={(v) => v && setSelectedGoalId(v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <span>
                  {selectedGoalId
                    ? goals.find((g) => g.id === selectedGoalId)?.title
                    : "Select a goal"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {goals.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject/Topic tree */}
          {subjects.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search subjects or topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 text-xs pl-7 pr-7"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] px-2 shrink-0"
                  onClick={toggleAll}
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </Button>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {filteredSubjects.length === 0 && (
                  <div className="px-3 py-6 text-xs text-muted-foreground text-center">
                    No subjects match &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
                {filteredSubjects.map((subject) => {
                  const isSubjectSelected = selectedSubjects.has(subject.id);
                  const isExpanded = expandedSubjects.has(subject.id);
                  const topics = topicsBySubject[subject.id] || [];
                  const isLoadingTopicsList = loadingTopics.has(subject.id);
                  const selectedTopicCount = topics.filter((t) =>
                    selectedTopics.has(t.id)
                  ).length;
                  const hasSelectedTopicsInSubject = selectedTopicCount > 0;
                  const q = searchQuery.toLowerCase();
                  const visibleTopics = q
                    ? topics.filter((t) => t.name.toLowerCase().includes(q))
                    : topics;

                  return (
                    <div key={subject.id} className="border-b last:border-b-0">
                      <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50">
                        <button
                          onClick={() => toggleExpand(subject.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <Checkbox
                          checked={
                            isSubjectSelected ||
                            (!isSubjectSelected && hasSelectedTopicsInSubject)
                          }
                          onCheckedChange={() => toggleSubject(subject.id)}
                        />
                        <span
                          className="text-sm cursor-pointer flex-1 truncate"
                          onClick={() => toggleSubject(subject.id)}
                        >
                          {subject.name}
                        </span>
                        {isSubjectSelected && (
                          <span className="text-[10px] text-green-600 dark:text-green-400">
                            All
                          </span>
                        )}
                        {!isSubjectSelected && selectedTopicCount > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {selectedTopicCount}/{topics.length}
                          </span>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="pl-9 pb-1">
                          {isLoadingTopicsList && (
                            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Loading...
                            </div>
                          )}
                          {visibleTopics.map((topic) => (
                            <div
                              key={topic.id}
                              className="flex items-center gap-2 px-3 py-1 hover:bg-muted/50 rounded-sm"
                            >
                              <Checkbox
                                checked={
                                  isSubjectSelected ||
                                  selectedTopics.has(topic.id)
                                }
                                disabled={isSubjectSelected}
                                onCheckedChange={() =>
                                  toggleTopic(topic.id, subject.id)
                                }
                              />
                              <span
                                className="text-xs cursor-pointer truncate"
                                onClick={() =>
                                  !isSubjectSelected &&
                                  toggleTopic(topic.id, subject.id)
                                }
                              >
                                {topic.name}
                              </span>
                            </div>
                          ))}
                          {!isLoadingTopicsList &&
                            visibleTopics.length === 0 &&
                            topics.length > 0 && (
                              <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
                                No matching topics
                              </div>
                            )}
                          {!isLoadingTopicsList && topics.length === 0 && (
                            <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
                              No topics
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedGoalId && subjects.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No subjects found for this goal
            </p>
          )}
        </div>

        {/* Right: settings panel */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <h3 className="text-sm font-semibold">Settings</h3>

            <div className="grid gap-1.5">
              <Label htmlFor="campaign-name" className="text-xs">
                Campaign Name
              </Label>
              <Input
                id="campaign-name"
                placeholder="e.g. GATE Full Revision"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Type</Label>
              <Select
                value={campaignType}
                onValueChange={(v) => v && setCampaignType(v as CampaignType)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <span className="flex items-center gap-1.5">
                    {CAMPAIGN_TYPE_LABELS[campaignType].icon}
                    {CAMPAIGN_TYPE_LABELS[campaignType].label}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(CAMPAIGN_TYPE_LABELS) as [
                      CampaignType,
                      { label: string; icon: React.ReactNode },
                    ][]
                  ).map(([val, { label, icon }]) => (
                    <SelectItem key={val} value={val}>
                      <span className="flex items-center gap-1.5">
                        {icon}
                        {label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="total-days" className="text-xs">
                  Total Days
                </Label>
                <Input
                  id="total-days"
                  type="number"
                  min={1}
                  max={365}
                  value={totalDays}
                  onChange={(e) => setTotalDays(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="parallel" className="text-xs">
                  Parallel Subjects
                </Label>
                <Input
                  id="parallel"
                  type="number"
                  min={1}
                  max={20}
                  value={parallelSubjects}
                  onChange={(e) => setParallelSubjects(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="start-date" className="text-xs">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              The engine will distribute subtopics across days based on parallel
              subject count. You can reorder in the preview.
            </p>
          </div>

          <Button
            className="w-full"
            onClick={onPreview}
            disabled={!hasSelection || previewLoading}
          >
            {previewLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Generating...
              </>
            ) : (
              <>
                Preview Schedule
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Preview Step ──

function PreviewStep({
  name,
  setName,
  preview,
  subjectOrder,
  onReorder,
  onBack,
  onCreate,
  submitting,
  previewLoading,
}: {
  name: string;
  setName: (v: string) => void;
  preview: CampaignPreview | null;
  subjectOrder: string[];
  onReorder: (order: string[]) => void;
  onBack: () => void;
  onCreate: () => void;
  submitting: boolean;
  previewLoading: boolean;
}) {
  if (!preview) return null;

  const moveSubject = (idx: number, dir: -1 | 1) => {
    const newOrder = [...subjectOrder];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
    onReorder(newOrder);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule Preview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {preview.total_items} items across {preview.total_days} days ({preview.daily_frequency}/day)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-48"
            />
            <Button onClick={onCreate} disabled={submitting || !name.trim()}>
              {submitting ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        {/* Left: subject order */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Subject Order
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Reorder to change which subjects are revised first
          </p>
          <div className="space-y-1">
            {preview.subjects.map((subj, idx) => (
              <div
                key={subj.subject_id}
                className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-2"
              >
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => moveSubject(idx, -1)}
                    disabled={idx === 0 || previewLoading}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveSubject(idx, 1)}
                    disabled={
                      idx === preview.subjects.length - 1 || previewLoading
                    }
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {subj.subject_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {subj.subtopic_count} subtopics
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                  #{idx + 1}
                </span>
              </div>
            ))}
          </div>
          {previewLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating...
            </div>
          )}
        </div>

        {/* Right: day-by-day schedule */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Daily Schedule
          </h3>
          <div className="space-y-1.5">
            {preview.schedule.map((day) => (
              <DayRow key={day.day_number} day={day} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayRow({ day }: { day: PreviewDay }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = new Date(day.date + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  // Group items by subject for color coding
  const subjectNames = [...new Set(day.items.map((i) => i.subject_name))];

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 text-left"
      >
        <span className="text-[11px] text-muted-foreground tabular-nums w-12 shrink-0">
          Day {day.day_number}
        </span>
        <span className="text-xs font-medium w-24 shrink-0">{dateStr}</span>
        <div className="flex-1 flex items-center gap-1 min-w-0 overflow-hidden">
          {subjectNames.map((name) => (
            <Badge
              key={name}
              variant="outline"
              className="text-[9px] px-1.5 py-0 shrink-0"
            >
              {name}
            </Badge>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">
          {day.items.length} items
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="border-t px-3 py-1.5 space-y-1">
          {day.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-0.5 text-xs"
            >
              <span className="text-[10px] text-muted-foreground w-4 tabular-nums shrink-0">
                {i + 1}.
              </span>
              <span className="font-medium truncate">
                {item.subtopic_name}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {item.subject_name} &rsaquo; {item.topic_name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
