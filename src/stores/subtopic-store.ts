import { create } from "zustand";
import api from "@/lib/api";
import { SubTopic, SubtopicFile, MasteryLevel } from "@/types";

interface SaveNotesData {
  notes_html?: string | null;
  sketch_data_url?: string | null;
  whiteboard_data_url?: string | null;
}

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
    topicId: string,
    subtopicId: string,
    data: Partial<SubTopic>
  ) => Promise<void>;
  deleteSubTopic: (topicId: string, subtopicId: string) => Promise<void>;
  duplicateSubTopic: (topicId: string, subtopic: SubTopic) => Promise<SubTopic>;
  reorderSubTopics: (topicId: string, orderedIds: string[]) => Promise<void>;
  setSubtopics: (subtopics: SubTopic[]) => void;
  recordRevision: (topicId: string, subtopicId: string) => Promise<void>;
  updatePerformance: (
    topicId: string,
    subtopicId: string,
    data: {
      questions_correct: number;
      mistake_count: number;
    }
  ) => Promise<void>;
  updateMastery: (
    topicId: string,
    subtopicId: string,
    mastery_level: MasteryLevel
  ) => Promise<void>;
  updateConfidence: (
    topicId: string,
    subtopicId: string,
    confidence_level: number
  ) => Promise<void>;
  saveNotes: (topicId: string, subtopicId: string, data: SaveNotesData) => Promise<SubTopic>;
  uploadFile: (topicId: string, subtopicId: string, file: File) => Promise<SubtopicFile>;
  deleteFile: (topicId: string, subtopicId: string, fileId: string) => Promise<void>;
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
  updateSubTopic: async (topicId, subtopicId, data) => {
    const res = await api.put(`/topics/${topicId}/subtopics/${subtopicId}`, data);
    set((state) => ({
      subtopics: state.subtopics.map((st) =>
        st.id === subtopicId ? res.data : st
      ),
    }));
  },
  deleteSubTopic: async (topicId, subtopicId) => {
    await api.delete(`/topics/${topicId}/subtopics/${subtopicId}`);
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
  recordRevision: async (topicId, subtopicId) => {
    const res = await api.post(`/topics/${topicId}/subtopics/${subtopicId}/revision`);
    set((state) => ({
      subtopics: state.subtopics.map((st) =>
        st.id === subtopicId ? res.data : st
      ),
    }));
  },
  updatePerformance: async (topicId, subtopicId, data) => {
    const res = await api.patch(`/topics/${topicId}/subtopics/${subtopicId}/performance`, data);
    set((state) => ({
      subtopics: state.subtopics.map((st) =>
        st.id === subtopicId ? res.data : st
      ),
    }));
  },
  updateMastery: async (topicId, subtopicId, mastery_level) => {
    const res = await api.put(`/topics/${topicId}/subtopics/${subtopicId}`, {
      mastery_level,
    });
    set((state) => ({
      subtopics: state.subtopics.map((st) =>
        st.id === subtopicId ? res.data : st
      ),
    }));
  },
  updateConfidence: async (topicId, subtopicId, confidence_level) => {
    const res = await api.put(`/topics/${topicId}/subtopics/${subtopicId}`, {
      confidence_level,
    });
    set((state) => ({
      subtopics: state.subtopics.map((st) =>
        st.id === subtopicId ? res.data : st
      ),
    }));
  },
  saveNotes: async (topicId, subtopicId, data) => {
    const res = await api.put(
      `/topics/${topicId}/subtopics/${subtopicId}/notes`,
      data,
    );
    set((state) => ({
      subtopics: state.subtopics.map((st) =>
        st.id === subtopicId ? res.data : st
      ),
    }));
    return res.data;
  },
  uploadFile: async (topicId, subtopicId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post(
      `/topics/${topicId}/subtopics/${subtopicId}/files`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },
  deleteFile: async (topicId, subtopicId, fileId) => {
    await api.delete(
      `/topics/${topicId}/subtopics/${subtopicId}/files/${fileId}`,
    );
  },
}));
