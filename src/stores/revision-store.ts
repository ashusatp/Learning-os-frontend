import { create } from "zustand";
import api from "@/lib/api";
import {
  QualityRating,
  RevisionCompleteResponse,
  RevisionQueueItem,
  RevisionQueueResponse,
  RevisionSchedule,
  RevisionStats,
  UserRevisionSettings,
} from "@/types";

interface RevisionState {
  // Queue
  overdue: RevisionQueueItem[];
  dueToday: RevisionQueueItem[];
  upcoming: RevisionQueueItem[];
  stats: RevisionStats | null;
  loading: boolean;
  error: string | null;

  // Settings
  settings: UserRevisionSettings | null;

  // Actions
  fetchQueue: (goalId: string) => Promise<void>;
  fetchStats: (goalId: string) => Promise<void>;
  completeRevision: (
    scheduleId: string,
    qualityRating: QualityRating,
    revisionNotes?: string
  ) => Promise<RevisionCompleteResponse>;
  skipRevision: (scheduleId: string) => Promise<void>;
  rescheduleRevision: (scheduleId: string, newDate: string) => Promise<void>;
  pauseRevision: (scheduleId: string) => Promise<void>;
  resumeRevision: (scheduleId: string) => Promise<void>;
  createSchedule: (subtopicId: string) => Promise<RevisionSchedule>;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<Pick<UserRevisionSettings, "daily_limit" | "vacation_until" | "catch_up_days">>) => Promise<void>;
}

export const useRevisionStore = create<RevisionState>((set, get) => ({
  overdue: [],
  dueToday: [],
  upcoming: [],
  stats: null,
  loading: false,
  error: null,
  settings: null,

  fetchQueue: async (goalId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<RevisionQueueResponse>(
        `/goals/${goalId}/revisions/queue`
      );
      set({
        overdue: res.data.overdue,
        dueToday: res.data.due_today,
        upcoming: res.data.upcoming,
        stats: res.data.stats,
        loading: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || "Failed to load revision queue",
        loading: false,
      });
    }
  },

  fetchStats: async (goalId: string) => {
    try {
      const res = await api.get<RevisionStats>(
        `/goals/${goalId}/revisions/stats`
      );
      set({ stats: res.data });
    } catch {
      // silent — stats are secondary
    }
  },

  completeRevision: async (
    scheduleId: string,
    qualityRating: QualityRating,
    revisionNotes?: string
  ) => {
    const res = await api.post<RevisionCompleteResponse>(
      `/revisions/${scheduleId}/complete`,
      { quality_rating: qualityRating, revision_notes: revisionNotes }
    );
    // Remove from queue
    set((state) => ({
      overdue: state.overdue.filter((i) => i.schedule_id !== scheduleId),
      dueToday: state.dueToday.filter((i) => i.schedule_id !== scheduleId),
    }));
    return res.data;
  },

  skipRevision: async (scheduleId: string) => {
    await api.post(`/revisions/${scheduleId}/skip`);
    set((state) => ({
      overdue: state.overdue.filter((i) => i.schedule_id !== scheduleId),
      dueToday: state.dueToday.filter((i) => i.schedule_id !== scheduleId),
    }));
  },

  rescheduleRevision: async (scheduleId: string, newDate: string) => {
    await api.post(`/revisions/${scheduleId}/reschedule`, {
      new_date: newDate,
    });
    set((state) => ({
      overdue: state.overdue.filter((i) => i.schedule_id !== scheduleId),
      dueToday: state.dueToday.filter((i) => i.schedule_id !== scheduleId),
    }));
  },

  pauseRevision: async (scheduleId: string) => {
    await api.post(`/revisions/${scheduleId}/pause`);
    set((state) => ({
      overdue: state.overdue.filter((i) => i.schedule_id !== scheduleId),
      dueToday: state.dueToday.filter((i) => i.schedule_id !== scheduleId),
      upcoming: state.upcoming.filter((i) => i.schedule_id !== scheduleId),
    }));
  },

  resumeRevision: async (scheduleId: string) => {
    await api.post(`/revisions/${scheduleId}/resume`);
  },

  createSchedule: async (subtopicId: string) => {
    const res = await api.post<RevisionSchedule>(
      `/subtopics/${subtopicId}/revision-schedule`
    );
    return res.data;
  },

  fetchSettings: async () => {
    try {
      const res = await api.get<UserRevisionSettings>("/revision-settings");
      set({ settings: res.data });
    } catch {
      // silent
    }
  },

  updateSettings: async (data) => {
    const res = await api.patch<UserRevisionSettings>(
      "/revision-settings",
      data
    );
    set({ settings: res.data });
  },
}));
