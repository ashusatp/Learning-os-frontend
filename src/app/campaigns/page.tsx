"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Pause,
  Play,
  Plus,
  Trash2,
  XCircle,
  BookOpen,
  AlertTriangle,
  Target,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { AuthGuard } from "@/components/auth-guard";
import { useCampaignStore } from "@/stores/campaign-store";
import { Campaign, CampaignStatus, CampaignType } from "@/types";
import { toast } from "sonner";

export default function CampaignsPage() {
  return (
    <AuthGuard>
      <CampaignsContent />
    </AuthGuard>
  );
}

const TYPE_LABELS: Record<CampaignType, { label: string; icon: React.ReactNode }> = {
  SUBTOPIC_REVISION: { label: "Subtopic Revision", icon: <BookOpen className="h-3.5 w-3.5" /> },
  MISTAKE_REVIEW: { label: "Mistake Review", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  PYQ_PRACTICE: { label: "PYQ Practice", icon: <Target className="h-3.5 w-3.5" /> },
};

const STATUS_STYLES: Record<CampaignStatus, { label: string; class: string }> = {
  ACTIVE: { label: "Active", class: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  PAUSED: { label: "Paused", class: "bg-yellow-100 text-yellow-700 dark:bg-amber-500/20 dark:text-amber-300" },
  COMPLETED: { label: "Completed", class: "bg-blue-100 text-blue-700 dark:bg-sky-500/20 dark:text-sky-300" },
  CANCELLED: { label: "Cancelled", class: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300" },
};

function CampaignsContent() {
  const router = useRouter();
  const {
    campaigns,
    loading,
    error,
    fetchCampaigns,
    pauseCampaign,
    resumeCampaign,
    cancelCampaign,
    deleteCampaign,
  } = useCampaignStore();

  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "ALL">("ALL");

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handlePause = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      try {
        await pauseCampaign(id);
        toast.success("Campaign paused");
      } catch {
        toast.error("Failed to pause campaign");
      }
    },
    [pauseCampaign]
  );

  const handleResume = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      try {
        await resumeCampaign(id);
        toast.success("Campaign resumed");
      } catch {
        toast.error("Failed to resume campaign");
      }
    },
    [resumeCampaign]
  );

  const handleCancel = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      try {
        await cancelCampaign(id);
        toast.success("Campaign cancelled");
      } catch {
        toast.error("Failed to cancel campaign");
      }
    },
    [cancelCampaign]
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!confirm("Delete this campaign? This cannot be undone.")) return;
      try {
        await deleteCampaign(id);
        toast.success("Campaign deleted");
      } catch {
        toast.error("Failed to delete campaign");
      }
    },
    [deleteCampaign]
  );

  const filtered =
    statusFilter === "ALL"
      ? campaigns
      : campaigns.filter((c) => c.status === statusFilter);

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const totalItemsToday = activeCampaigns.reduce(
    (sum, c) => sum + c.daily_frequency,
    0
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header breadcrumbs={[{ label: "Campaigns" }]} />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {/* Title row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Revision Campaigns
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Custom revision schedules for subjects, mistakes & PYQs
            </p>
          </div>
          <Link href="/campaigns/new" className={buttonVariants()}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Campaign
          </Link>
        </div>

        {/* Quick stats */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-lg border bg-card px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Play className="h-4 w-4 text-green-500" />
                <span className="text-[11px] text-muted-foreground">Active</span>
              </div>
              <span className="text-xl font-bold">{activeCampaigns.length}</span>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-violet-500" />
                <span className="text-[11px] text-muted-foreground">Per Day</span>
              </div>
              <span className="text-xl font-bold">{totalItemsToday}</span>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                <span className="text-[11px] text-muted-foreground">Total</span>
              </div>
              <span className="text-xl font-bold">{campaigns.length}</span>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {campaigns.length > 0 && (
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto">
            {(["ALL", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] as const).map(
              (s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "ALL" ? "All" : STATUS_STYLES[s].label}
                </Button>
              )
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center justify-center py-16 text-destructive gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && campaigns.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">No campaigns yet</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Create a revision campaign to schedule focused study sessions
              for your subjects, mistakes, or PYQs.
            </p>
            <Link href="/campaigns/new" className={buttonVariants()}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Campaign
            </Link>
          </div>
        )}

        {/* Campaign list */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onClick={() => router.push(`/campaigns/${campaign.id}`)}
                onPause={handlePause}
                onResume={handleResume}
                onCancel={handleCancel}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && campaigns.length > 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              No campaigns with this status
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function CampaignCard({
  campaign,
  onClick,
  onPause,
  onResume,
  onCancel,
  onDelete,
}: {
  campaign: Campaign;
  onClick: () => void;
  onPause: (e: React.MouseEvent, id: string) => void;
  onResume: (e: React.MouseEvent, id: string) => void;
  onCancel: (e: React.MouseEvent, id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}) {
  const progress =
    campaign.total_items > 0
      ? Math.round((campaign.completed_items / campaign.total_items) * 100)
      : 0;

  const typeInfo = TYPE_LABELS[campaign.campaign_type];
  const statusInfo = STATUS_STYLES[campaign.status];

  const startDate = new Date(campaign.start_date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const endDate = new Date(campaign.end_date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <div
      onClick={onClick}
      className="rounded-lg border bg-card p-4 hover:bg-muted/30 cursor-pointer transition-colors"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold truncate">{campaign.name}</h3>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 shrink-0 ${statusInfo.class}`}
            >
              {statusInfo.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              {typeInfo.icon}
              {typeInfo.label}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {campaign.total_days}d &middot; {campaign.daily_frequency} subtopics/day
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {startDate} - {endDate}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {campaign.status === "ACTIVE" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => onPause(e, campaign.id)}
              title="Pause"
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}
          {campaign.status === "PAUSED" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => onResume(e, campaign.id)}
              title="Resume"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          {(campaign.status === "ACTIVE" || campaign.status === "PAUSED") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-orange-500"
              onClick={(e) => onCancel(e, campaign.id)}
              title="Cancel"
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => onDelete(e, campaign.id)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress value={progress} className="h-1.5 flex-1" />
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {campaign.completed_items}/{campaign.total_items}
        </span>
      </div>
    </div>
  );
}
