"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  AlertTriangle,
  Target,
  Circle,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { AuthGuard } from "@/components/auth-guard";
import { useCampaignStore } from "@/stores/campaign-store";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CampaignItem, CampaignScope, CampaignType } from "@/types";
import { toast } from "sonner";

export default function CampaignDetailPage() {
  return (
    <AuthGuard>
      <CampaignDetailContent />
    </AuthGuard>
  );
}

const TYPE_META: Record<CampaignType, { label: string; icon: React.ReactNode }> = {
  SUBTOPIC_REVISION: { label: "Subtopic Revision", icon: <BookOpen className="h-5 w-5" /> },
  MISTAKE_REVIEW: { label: "Mistake Review", icon: <AlertTriangle className="h-5 w-5" /> },
  PYQ_PRACTICE: { label: "PYQ Practice", icon: <Target className="h-5 w-5" /> },
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  PAUSED: "bg-yellow-100 text-yellow-700 dark:bg-amber-500/20 dark:text-amber-300",
  COMPLETED: "bg-blue-100 text-blue-700 dark:bg-sky-500/20 dark:text-sky-300",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
};

function CampaignDetailContent() {
  const params = useParams();
  const campaignId = params.campaignId as string;

  const {
    activeCampaign,
    campaignItems,
    fetchCampaign,
    fetchCampaignItems,
    completeItem,
  } = useCampaignStore();

  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [confirmItemId, setConfirmItemId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const campaign = await fetchCampaign(campaignId);
        await fetchCampaignItems(campaignId);
        const today = new Date().toISOString().split("T")[0];
        if (today >= campaign.start_date && today <= campaign.end_date) {
          setSelectedDate(today);
        } else {
          setSelectedDate(campaign.start_date);
        }
      } catch {
        toast.error("Failed to load campaign");
      }
      setLoading(false);
    })();
  }, [campaignId, fetchCampaign, fetchCampaignItems]);

  const handleComplete = useCallback(
    async (itemId: string) => {
      setCompleting(itemId);
      try {
        await completeItem(itemId);
        toast.success("Item completed!");
        await fetchCampaignItems(campaignId);
      } catch {
        toast.error("Failed to complete item");
      }
      setCompleting(null);
    },
    [completeItem, fetchCampaignItems, campaignId]
  );

  const itemsByDate = useMemo(() => {
    const map: Record<string, CampaignItem[]> = {};
    for (const item of campaignItems) {
      if (!map[item.scheduled_date]) map[item.scheduled_date] = [];
      map[item.scheduled_date].push(item);
    }
    return map;
  }, [campaignItems]);

  const dates = useMemo(
    () => Object.keys(itemsByDate).sort(),
    [itemsByDate]
  );

  const currentDateItems = selectedDate ? itemsByDate[selectedDate] || [] : [];
  const completedForDate = currentDateItems.filter((i) => i.is_completed).length;
  const pendingItems = currentDateItems.filter((i) => !i.is_completed);
  const doneItems = currentDateItems.filter((i) => i.is_completed);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }, { label: "..." }]} />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex gap-8">
            <div className="flex-1">
              <Skeleton className="h-8 w-64 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="w-80">
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!activeCampaign) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }, { label: "Not found" }]} />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          <p className="text-muted-foreground">Campaign not found</p>
        </main>
      </div>
    );
  }

  const campaign = activeCampaign;
  const progress =
    campaign.total_items > 0
      ? Math.round((campaign.completed_items / campaign.total_items) * 100)
      : 0;

  const shortDate = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        breadcrumbs={[
          { label: "Campaigns", href: "/campaigns" },
          { label: campaign.name },
        ]}
      />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Left column: Info & Navigation ── */}
          <div className="w-full lg:w-[340px] shrink-0">
            <div className="lg:sticky lg:top-8 space-y-4">

              {/* Campaign card — consolidated header */}
              <div className="rounded-xl border bg-card overflow-hidden">
                {/* Title section */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h1 className="text-2xl font-bold tracking-tight leading-tight">{campaign.name}</h1>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 shrink-0 ${STATUS_STYLES[campaign.status] || ""}`}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {TYPE_META[campaign.campaign_type].icon}
                      {TYPE_META[campaign.campaign_type].label}
                    </span>
                    <span>&middot;</span>
                    <span>{campaign.total_days}d &middot; {campaign.daily_frequency}/day</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(campaign.start_date + "T00:00:00").toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                    {" – "}
                    {new Date(campaign.end_date + "T00:00:00").toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>

                </div>

                {/* Overall progress */}
                <div className="px-5 pb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-muted-foreground">Overall</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {campaign.completed_items}/{campaign.total_items} ({progress}%)
                    </span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              </div>

              {/* Calendar card */}
              <CampaignCalendar
                startDate={campaign.start_date}
                endDate={campaign.end_date}
                itemsByDate={itemsByDate}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />

              {/* Scopes card — expandable */}
              {campaign.scopes && campaign.scopes.length > 0 && (
                <ScopesCard scopes={campaign.scopes} />
              )}

            </div>
          </div>

          {/* ── Right column: Items ── */}
          <div className="flex-1 min-w-0">
            {/* Date header for right panel */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <div>
                <h2 className="text-base font-semibold">{shortDate}</h2>
                <p className="text-xs text-muted-foreground">
                  {currentDateItems.length} item{currentDateItems.length !== 1 ? "s" : ""} scheduled
                  {completedForDate > 0 && ` · ${completedForDate} done`}
                </p>
              </div>
              {currentDateItems.length > 0 && completedForDate === currentDateItems.length && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  All Done
                </Badge>
              )}
            </div>

            {currentDateItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Calendar className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No items for this date</p>
              </div>
            )}

            {/* Pending items */}
            {pendingItems.length > 0 && (
              <div className="space-y-2 mb-6">
                {pendingItems.map((item, i) => (
                  <CampaignItemCard
                    key={item.id}
                    item={item}
                    index={i + 1}
                    campaignType={campaign.campaign_type}
                    onComplete={setConfirmItemId}
                    completing={completing === item.id}
                  />
                ))}
              </div>
            )}

            {/* Completed items */}
            {doneItems.length > 0 && (
              <div>
                {pendingItems.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Completed ({doneItems.length})
                    </span>
                    <div className="flex-1 border-t border-dashed" />
                  </div>
                )}
                <div className="space-y-2">
                  {doneItems.map((item, i) => (
                    <CampaignItemCard
                      key={item.id}
                      item={item}
                      index={pendingItems.length + i + 1}
                      campaignType={campaign.campaign_type}
                      onComplete={setConfirmItemId}
                      completing={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <ConfirmDialog
          open={!!confirmItemId}
          onOpenChange={(open) => { if (!open) setConfirmItemId(null); }}
          title="Mark as done?"
          description="This item will be marked as completed. This action can't be undone."
          confirmLabel="Mark Done"
          onConfirm={() => {
            if (confirmItemId) handleComplete(confirmItemId);
          }}
          loading={!!completing}
        />
      </main>
    </div>
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

function CampaignCalendar({
  startDate,
  endDate,
  itemsByDate,
  selectedDate,
  onSelectDate,
}: {
  startDate: string;
  endDate: string;
  itemsByDate: Record<string, CampaignItem[]>;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
}) {
  // Determine which month to show based on selected date or today
  const todayStr = new Date().toISOString().split("T")[0];
  const initialDate = selectedDate || todayStr;
  const [viewYear, setViewYear] = useState(() => parseInt(initialDate.split("-")[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(initialDate.split("-")[1]));

  const goToPrev = () => {
    if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12); }
    else { setViewMonth(viewMonth - 1); }
  };
  const goToNext = () => {
    if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1); }
    else { setViewMonth(viewMonth + 1); }
  };
  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
  };

  const firstDayOfMonth = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goToPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </span>
          <Button variant="ghost" size="sm" className="text-[10px] h-5 px-1.5" onClick={goToToday}>
            Today
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goToNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-4">
        {DAY_NAMES.map((d, i) => (
          <div key={i} className="text-[10px] text-center text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-4 pb-3">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`e-${i}`} className="h-9" />;
          }

          const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const inRange = dateStr >= startDate && dateStr <= endDate;
          const dayItems = itemsByDate[dateStr];
          const hasItems = !!dayItems && dayItems.length > 0;
          const allDone = hasItems && dayItems.every((it) => it.is_completed);
          const someDone = hasItems && dayItems.some((it) => it.is_completed);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;

          return (
            <button
              key={dateStr}
              onClick={() => inRange && hasItems && onSelectDate(dateStr)}
              disabled={!inRange || !hasItems}
              className={`h-9 flex flex-col items-center justify-center rounded-md text-xs relative transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground font-bold ring-2 ring-primary/20"
                  : isToday && inRange
                  ? "bg-primary/10 font-bold text-primary"
                  : allDone
                  ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 hover:bg-green-200"
                  : someDone
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 hover:bg-amber-200"
                  : inRange && hasItems
                  ? "text-foreground hover:bg-muted"
                  : inRange
                  ? "text-muted-foreground/40"
                  : "text-muted-foreground/20"
              }`}
            >
              <span>{day}</span>
              {hasItems && !isSelected && (
                <div className="flex gap-0.5 mt-0.5">
                  <span
                    className={`h-1 w-1 rounded-full ${
                      allDone
                        ? "bg-green-500"
                        : someDone
                        ? "bg-amber-500"
                        : "bg-violet-500"
                    }`}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Day progress for selected date */}
      {selectedDate && itemsByDate[selectedDate] && (
        <div className="border-t px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
              {selectedDate === todayStr && (
                <span className="text-primary ml-1">· Today</span>
              )}
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {itemsByDate[selectedDate].filter((i) => i.is_completed).length}/{itemsByDate[selectedDate].length}
            </span>
          </div>
          <Progress
            value={
              (itemsByDate[selectedDate].filter((i) => i.is_completed).length /
                itemsByDate[selectedDate].length) *
              100
            }
            className="h-1.5"
          />
        </div>
      )}

      {/* Legend */}
      <div className="border-t px-4 py-2.5 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Done
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Partial
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          Scheduled
        </span>
      </div>
    </div>
  );
}

function ScopesCard({ scopes }: { scopes: CampaignScope[] }) {
  const [expanded, setExpanded] = useState(false);

  // Group scopes by subject
  const grouped = useMemo(() => {
    const map: Record<string, { subject_name: string; topics: string[] }> = {};
    for (const scope of scopes) {
      const key = scope.subject_id;
      if (!map[key]) {
        map[key] = { subject_name: scope.subject_name || "Unknown", topics: [] };
      }
      if (scope.scope_type === "TOPIC" && scope.topic_name) {
        map[key].topics.push(scope.topic_name);
      }
    }
    return Object.values(map);
  }, [scopes]);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Subjects</span>
          <span className="text-[11px] text-muted-foreground">({grouped.length})</span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t px-5 py-3 space-y-3">
          {grouped.map((group) => (
            <div key={group.subject_name}>
              <p className="text-xs font-semibold">{group.subject_name}</p>
              {group.topics.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {group.topics.map((topic) => (
                    <Badge key={topic} variant="outline" className="text-[10px] font-normal">
                      {topic}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-0.5">All topics</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignItemCard({
  item,
  index,
  campaignType,
  onComplete,
  completing,
}: {
  item: CampaignItem;
  index: number;
  campaignType: CampaignType;
  onComplete: (id: string) => void;
  completing: boolean;
}) {
  const title =
    campaignType === "SUBTOPIC_REVISION"
      ? item.subtopic_name
      : campaignType === "MISTAKE_REVIEW"
      ? item.subtopic_name || "Mistake"
      : item.subtopic_name || "PYQ";

  const subtitle =
    [item.subject_name, item.topic_name].filter(Boolean).join(" › ") || "";

  return (
    <div
      className={`group rounded-lg border bg-card px-4 py-3.5 transition-all ${
        item.is_completed
          ? "border-l-4 border-l-green-500 opacity-60"
          : "border-l-4 border-l-violet-500 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Status icon */}
          <div className="mt-0.5 shrink-0">
            {item.is_completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <span
              className={`text-sm font-semibold block ${
                item.is_completed ? "line-through text-muted-foreground" : ""
              }`}
            >
              {title}
            </span>
            {subtitle && (
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                {subtitle}
              </span>
            )}
            {campaignType === "MISTAKE_REVIEW" && item.mistake_description && (
              <p
                className="text-xs text-muted-foreground mt-1.5 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: item.mistake_description }}
              />
            )}
            {campaignType === "PYQ_PRACTICE" && item.question_text && (
              <p
                className="text-xs text-muted-foreground mt-1.5 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: item.question_text }}
              />
            )}
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground tabular-nums">#{index}</span>
          {!item.is_completed && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-4"
              onClick={() => onComplete(item.id)}
              disabled={completing}
            >
              {completing ? "..." : "Mark Done"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
