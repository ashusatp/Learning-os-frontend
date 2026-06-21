import { create } from "zustand";
import api from "@/lib/api";
import { Topic } from "@/types";

interface TopicState {
  topics: Topic[];
  activeTopic: Topic | null;
  loading: boolean;
  error: string | null;
  fetchTopics: (subjectId: string, includeArchived?: boolean) => Promise<void>;
  setActiveTopic: (topic: Topic) => void;
  createTopic: (subjectId: string, data: Partial<Topic>) => Promise<Topic>;
  updateTopic: (topicId: string, data: Partial<Topic>) => Promise<void>;
  deleteTopic: (topicId: string) => Promise<void>;
  duplicateTopic: (subjectId: string, topic: Topic) => Promise<Topic>;
  reorderTopics: (subjectId: string, orderedIds: string[]) => Promise<void>;
  setTopics: (topics: Topic[]) => void;
  archiveTopic: (topicId: string, archive?: boolean) => Promise<void>;
}

export const useTopicStore = create<TopicState>((set) => ({
  topics: [],
  activeTopic: null,
  loading: false,
  error: null,
  fetchTopics: async (subjectId, includeArchived = false) => {
    set({ loading: true, error: null, topics: [] });
    try {
      const res = await api.get(`/subjects/${subjectId}/topics`, {
        params: includeArchived ? { include_archived: true } : undefined,
      });
      set({ topics: res.data, loading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch topics";
      set({ error: message, loading: false });
    }
  },
  setActiveTopic: (topic) => set({ activeTopic: topic }),
  createTopic: async (subjectId, data) => {
    const res = await api.post(`/subjects/${subjectId}/topics`, data);
    set((state) => ({ topics: [...state.topics, res.data] }));
    return res.data;
  },
  updateTopic: async (topicId, data) => {
    const res = await api.put(`/topics/${topicId}`, data);
    set((state) => ({
      topics: state.topics.map((t) => (t.id === topicId ? res.data : t)),
      activeTopic:
        state.activeTopic?.id === topicId ? res.data : state.activeTopic,
    }));
  },
  deleteTopic: async (topicId) => {
    await api.delete(`/topics/${topicId}`);
    set((state) => ({
      topics: state.topics.filter((t) => t.id !== topicId),
      activeTopic:
        state.activeTopic?.id === topicId ? null : state.activeTopic,
    }));
  },
  duplicateTopic: async (subjectId, topic) => {
    const res = await api.post(`/subjects/${subjectId}/topics`, {
      name: `${topic.name} (copy)`,
      description: topic.description,
    });
    set((state) => ({ topics: [...state.topics, res.data] }));
    return res.data;
  },
  reorderTopics: async (subjectId, orderedIds) => {
    await api.put(`/subjects/${subjectId}/topics/reorder`, {
      ordered_ids: orderedIds,
    });
  },
  setTopics: (topics) => set({ topics }),
  archiveTopic: async (topicId, archive = true) => {
    const topic = useTopicStore.getState().topics.find((t) => t.id === topicId);
    const subjectId = topic?.subject_id || "_";
    const res = await api.patch(`/subjects/${subjectId}/topics/${topicId}/archive`, null, {
      params: { archive },
    });
    set((state) => ({
      topics: state.topics.map((t) => (t.id === topicId ? res.data : t)),
      activeTopic:
        state.activeTopic?.id === topicId ? res.data : state.activeTopic,
    }));
  },
}));
