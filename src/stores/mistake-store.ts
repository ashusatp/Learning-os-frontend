import { create } from "zustand";
import api from "@/lib/api";
import { Mistake } from "@/types";

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
  fetchMistakes: (subtopicId: string, resolved?: boolean | null) => Promise<void>;
  fetchMistakesByGoal: (goalId: string, resolved?: boolean | null) => Promise<void>;
  createMistake: (subtopicId: string, data: CreateMistakeData) => Promise<Mistake>;
  updateMistake: (subtopicId: string, mistakeId: string, data: UpdateMistakeData) => Promise<Mistake>;
  resolveMistake: (subtopicId: string, mistakeId: string) => Promise<Mistake>;
  reviseMistake: (subtopicId: string, mistakeId: string) => Promise<Mistake>;
  deleteMistake: (subtopicId: string, mistakeId: string) => Promise<void>;
}

export const useMistakeStore = create<MistakeState>((set) => ({
  mistakes: [],
  loading: false,
  error: null,
  fetchMistakes: async (subtopicId, resolved) => {
    set({ loading: true, error: null, mistakes: [] });
    try {
      const params = resolved !== null && resolved !== undefined ? { resolved } : {};
      const res = await api.get(`/subtopics/${subtopicId}/mistakes`, { params });
      set({ mistakes: res.data, loading: false });
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
    set((state) => ({ mistakes: [res.data, ...state.mistakes] }));
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
    set((state) => ({
      mistakes: state.mistakes.filter((m) => m.id !== mistakeId),
    }));
  },
}));
