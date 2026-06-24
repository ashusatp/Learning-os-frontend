import { create } from "zustand";
import api from "@/lib/api";
import {
  Campaign,
  CampaignItem,
  CampaignPreview,
  CampaignQueue,
  CampaignStatus,
} from "@/types";

interface CampaignState {
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  todaysQueue: CampaignQueue[];
  campaignItems: CampaignItem[];
  preview: CampaignPreview | null;
  previewLoading: boolean;
  loading: boolean;
  error: string | null;
  fetchCampaigns: (status?: CampaignStatus) => Promise<void>;
  fetchCampaign: (id: string) => Promise<Campaign>;
  createCampaign: (data: CreateCampaignData) => Promise<Campaign>;
  deleteCampaign: (id: string) => Promise<void>;
  pauseCampaign: (id: string) => Promise<void>;
  resumeCampaign: (id: string) => Promise<void>;
  cancelCampaign: (id: string) => Promise<void>;
  fetchTodaysQueue: (date?: string) => Promise<void>;
  fetchCampaignItems: (id: string, date?: string) => Promise<void>;
  completeItem: (itemId: string, notes?: string) => Promise<void>;
  fetchPreview: (data: PreviewData) => Promise<CampaignPreview>;
  clearPreview: () => void;
}

interface ScopeData {
  scope_type: string;
  subject_id: string;
  topic_id?: string | null;
}

interface PreviewData {
  campaign_type: string;
  total_days: number;
  daily_frequency?: number | null;
  parallel_subjects: number;
  start_date: string;
  scopes: ScopeData[];
  subject_order?: string[];
}

interface CreateCampaignData extends PreviewData {
  name: string;
}

export const useCampaignStore = create<CampaignState>((set) => ({
  campaigns: [],
  activeCampaign: null,
  todaysQueue: [],
  campaignItems: [],
  preview: null,
  previewLoading: false,
  loading: false,
  error: null,

  fetchCampaigns: async (status) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<Campaign[]>("/campaigns", {
        params: status ? { status } : undefined,
      });
      set({ campaigns: res.data, loading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch campaigns";
      set({ error: message, loading: false });
    }
  },

  fetchCampaign: async (id) => {
    const res = await api.get<Campaign>(`/campaigns/${id}`);
    set({ activeCampaign: res.data });
    return res.data;
  },

  createCampaign: async (data) => {
    const res = await api.post<Campaign>("/campaigns", data);
    set((state) => ({ campaigns: [res.data, ...state.campaigns] }));
    return res.data;
  },

  deleteCampaign: async (id) => {
    await api.delete(`/campaigns/${id}`);
    set((state) => ({
      campaigns: state.campaigns.filter((c) => c.id !== id),
      activeCampaign:
        state.activeCampaign?.id === id ? null : state.activeCampaign,
    }));
  },

  pauseCampaign: async (id) => {
    const res = await api.post<Campaign>(`/campaigns/${id}/pause`);
    set((state) => ({
      campaigns: state.campaigns.map((c) => (c.id === id ? res.data : c)),
      activeCampaign:
        state.activeCampaign?.id === id ? res.data : state.activeCampaign,
    }));
  },

  resumeCampaign: async (id) => {
    const res = await api.post<Campaign>(`/campaigns/${id}/resume`);
    set((state) => ({
      campaigns: state.campaigns.map((c) => (c.id === id ? res.data : c)),
      activeCampaign:
        state.activeCampaign?.id === id ? res.data : state.activeCampaign,
    }));
  },

  cancelCampaign: async (id) => {
    const res = await api.post<Campaign>(`/campaigns/${id}/cancel`);
    set((state) => ({
      campaigns: state.campaigns.map((c) => (c.id === id ? res.data : c)),
      activeCampaign:
        state.activeCampaign?.id === id ? res.data : state.activeCampaign,
    }));
  },

  fetchTodaysQueue: async (date) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<CampaignQueue[]>("/campaigns/queue/today", {
        params: date ? { target_date: date } : undefined,
      });
      set({ todaysQueue: res.data, loading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch queue";
      set({ error: message, loading: false });
    }
  },

  fetchCampaignItems: async (id, date) => {
    const res = await api.get<CampaignItem[]>(`/campaigns/${id}/items`, {
      params: date ? { target_date: date } : undefined,
    });
    set({ campaignItems: res.data });
  },

  completeItem: async (itemId, notes) => {
    const res = await api.post<CampaignItem>(
      `/campaigns/items/${itemId}/complete`,
      { notes: notes || null }
    );
    const completed = res.data;
    set((state) => ({
      campaignItems: state.campaignItems.map((i) =>
        i.id === itemId ? completed : i
      ),
      todaysQueue: state.todaysQueue.map((q) => ({
        ...q,
        items: q.items.map((i) => (i.id === itemId ? completed : i)),
        completed_for_day: q.items.some((i) => i.id === itemId)
          ? q.completed_for_day + 1
          : q.completed_for_day,
      })),
      campaigns: state.campaigns.map((c) =>
        c.id === completed.campaign_id
          ? { ...c, completed_items: c.completed_items + 1 }
          : c
      ),
    }));
  },

  fetchPreview: async (data) => {
    set({ previewLoading: true });
    try {
      const res = await api.post<CampaignPreview>("/campaigns/preview", data);
      set({ preview: res.data, previewLoading: false });
      return res.data;
    } catch {
      set({ previewLoading: false });
      throw new Error("Failed to generate preview");
    }
  },

  clearPreview: () => set({ preview: null }),
}));
