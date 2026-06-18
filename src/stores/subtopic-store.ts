import { create } from "zustand";
import api from "@/lib/api";
import { SubTopic } from "@/types";

interface SubTopicState {
  subtopics: SubTopic[];
  loading: boolean;
  error: string | null;
  fetchSubTopics: (topicId: string) => Promise<void>;
  createSubTopic: (
    topicId: string,
    data: Partial<SubTopic>
  ) => Promise<SubTopic>;
  updateSubTopic: (
    subtopicId: string,
    data: Partial<SubTopic>
  ) => Promise<void>;
  deleteSubTopic: (subtopicId: string) => Promise<void>;
  duplicateSubTopic: (topicId: string, subtopic: SubTopic) => Promise<SubTopic>;
  reorderSubTopics: (topicId: string, orderedIds: string[]) => Promise<void>;
  setSubtopics: (subtopics: SubTopic[]) => void;
  recordRevision: (subtopicId: string) => Promise<void>;
  updatePerformance: (
    subtopicId: string,
    data: { questions_solved: number; questions_correct: number }
  ) => Promise<void>;
}

export const useSubTopicStore = create<SubTopicState>((set) => ({
  subtopics: [],
  loading: false,
  error: null,
  fetchSubTopics: async (topicId) => {
    set({ loading: true, error: null, subtopics: [] });
    try {
      const res = await api.get(`/topics/${topicId}/subtopics`);
      set({ subtopics: res.data, loading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch subtopics";
      set({ error: message, loading: false });
    }
  },
  createSubTopic: async (topicId, data) => {
    const res = await api.post(`/topics/${topicId}/subtopics`, data);
    set((state) => ({ subtopics: [...state.subtopics, res.data] }));
    return res.data;
  },
  updateSubTopic: async (subtopicId, data) => {
    const res = await api.put(`/subtopics/${subtopicId}`, data);
    set((state) => ({
      subtopics: state.subtopics.map((st) =>
        st.id === subtopicId ? res.data : st
      ),
    }));
  },
  deleteSubTopic: async (subtopicId) => {
    await api.delete(`/subtopics/${subtopicId}`);
    set((state) => ({
      subtopics: state.subtopics.filter((st) => st.id !== subtopicId),
    }));
  },
  duplicateSubTopic: async (topicId, subtopic) => {
    const res = await api.post(`/topics/${topicId}/subtopics`, {
      name: `${subtopic.name} (copy)`,
      description: subtopic.description,
    });
    set((state) => ({ subtopics: [...state.subtopics, res.data] }));
    return res.data;
  },
  reorderSubTopics: async (topicId, orderedIds) => {
    await api.put(`/topics/${topicId}/subtopics/reorder`, {
      ordered_ids: orderedIds,
    });
  },
  setSubtopics: (subtopics) => set({ subtopics }),
  recordRevision: async (subtopicId) => {
    const res = await api.post(`/subtopics/${subtopicId}/revise`);
    set((state) => ({
      subtopics: state.subtopics.map((st) =>
        st.id === subtopicId ? res.data : st
      ),
    }));
  },
  updatePerformance: async (subtopicId, data) => {
    const res = await api.put(`/subtopics/${subtopicId}/performance`, data);
    set((state) => ({
      subtopics: state.subtopics.map((st) =>
        st.id === subtopicId ? res.data : st
      ),
    }));
  },
}));
