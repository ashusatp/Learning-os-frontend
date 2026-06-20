import { create } from "zustand";
import api from "@/lib/api";
import { Mistake, PaginatedResponse } from "@/types";

interface CreateMistakeData {
  question_id?: string | null;
  mistake_type?: string;
  description_html: string;
  correction_html?: string | null;
  tags?: string[];
}

interface UpdateMistakeData {
  mistake_type?: string;
  description_html?: string;
  correction_html?: string | null;
  tags?: string[];
}

interface MistakeState {
  mistakes: Mistake[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  fetchMistakes: (subtopicId: string, resolved?: boolean | null, page?: number, pageSize?: number) => Promise<void>;
  fetchMistakesByGoal: (goalId: string, resolved?: boolean | null) => Promise<void>;
  createMistake: (subtopicId: string, data: CreateMistakeData) => Promise<Mistake>;
  updateMistake: (subtopicId: string, mistakeId: string, data: UpdateMistakeData) => Promise<Mistake>;
  resolveMistake: (subtopicId: string, mistakeId: string) => Promise<Mistake>;
  reviseMistake: (subtopicId: string, mistakeId: string) => Promise<Mistake>;
  deleteMistake: (subtopicId: string, mistakeId: string) => Promise<void>;
}

export const useMistakeStore = create<MistakeState>((set, get) => ({
  mistakes: [],
  loading: false,
  error: null,
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
  fetchMistakes: async (subtopicId, resolved, page, pageSize) => {
    const p = page ?? get().page;
    const ps = pageSize ?? get().pageSize;
    set({ loading: true, error: null });
    try {
      const params: Record<string, unknown> = { page: p, page_size: ps };
      if (resolved !== null && resolved !== undefined) {
        params.resolved = resolved;
      }
      const res = await api.get<PaginatedResponse<Mistake>>(
        `/subtopics/${subtopicId}/mistakes`,
        { params }
      );
      set({
        mistakes: res.data.items,
        total: res.data.total,
        page: res.data.page,
        pageSize: res.data.page_size,
        totalPages: res.data.total_pages,
        loading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch mistakes";
      set({ error: message, loading: false });
    }
  },
  fetchMistakesByGoal: async (goalId, resolved) => {
    set({ loading: true, error: null, mistakes: [] });
    try {
      const params = resolved !== null && resolved !== undefined ? { resolved } : {};
      const res = await api.get(`/goals/${goalId}/mistakes`, { params });
      set({ mistakes: res.data, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch mistakes";
      set({ error: message, loading: false });
    }
  },
  createMistake: async (subtopicId, data) => {
    const res = await api.post(`/subtopics/${subtopicId}/mistakes`, data);
    // Refetch page 1 since new mistake goes to top
    get().fetchMistakes(subtopicId, null, 1);
    return res.data;
  },
  updateMistake: async (subtopicId, mistakeId, data) => {
    const res = await api.put(`/subtopics/${subtopicId}/mistakes/${mistakeId}`, data);
    set((state) => ({
      mistakes: state.mistakes.map((m) => (m.id === mistakeId ? res.data : m)),
    }));
    return res.data;
  },
  resolveMistake: async (subtopicId, mistakeId) => {
    const res = await api.patch(`/subtopics/${subtopicId}/mistakes/${mistakeId}/resolve`);
    set((state) => ({
      mistakes: state.mistakes.map((m) => (m.id === mistakeId ? res.data : m)),
    }));
    return res.data;
  },
  reviseMistake: async (subtopicId, mistakeId) => {
    const res = await api.patch(`/subtopics/${subtopicId}/mistakes/${mistakeId}/revise`);
    set((state) => ({
      mistakes: state.mistakes.map((m) => (m.id === mistakeId ? res.data : m)),
    }));
    return res.data;
  },
  deleteMistake: async (subtopicId, mistakeId) => {
    await api.delete(`/subtopics/${subtopicId}/mistakes/${mistakeId}`);
    const { page, pageSize } = get();
    get().fetchMistakes(subtopicId, null, page, pageSize);
  },
}));
