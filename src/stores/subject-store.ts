import { create } from "zustand";
import api from "@/lib/api";
import { Subject } from "@/types";

interface SubjectState {
  subjects: Subject[];
  activeSubject: Subject | null;
  loading: boolean;
  error: string | null;
  fetchSubjects: (goalId: string, includeArchived?: boolean) => Promise<void>;
  setActiveSubject: (subject: Subject) => void;
  createSubject: (goalId: string, data: Partial<Subject>) => Promise<Subject>;
  updateSubject: (subjectId: string, data: Partial<Subject>) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  archiveSubject: (subjectId: string, archive?: boolean) => Promise<void>;
}

export const useSubjectStore = create<SubjectState>((set) => ({
  subjects: [],
  activeSubject: null,
  loading: false,
  error: null,
  fetchSubjects: async (goalId, includeArchived = false) => {
    set({ loading: true, error: null, subjects: [] });
    try {
      const res = await api.get(`/goals/${goalId}/subjects`, {
        params: includeArchived ? { include_archived: true } : undefined,
      });
      set({ subjects: res.data, loading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch subjects";
      set({ error: message, loading: false });
    }
  },
  setActiveSubject: (subject) => set({ activeSubject: subject }),
  createSubject: async (goalId, data) => {
    const res = await api.post(`/goals/${goalId}/subjects`, data);
    set((state) => ({ subjects: [...state.subjects, res.data] }));
    return res.data;
  },
  updateSubject: async (subjectId, data) => {
    const res = await api.put(`/subjects/${subjectId}`, data);
    set((state) => ({
      subjects: state.subjects.map((s) =>
        s.id === subjectId ? res.data : s
      ),
      activeSubject:
        state.activeSubject?.id === subjectId
          ? res.data
          : state.activeSubject,
    }));
  },
  deleteSubject: async (subjectId) => {
    await api.delete(`/subjects/${subjectId}`);
    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== subjectId),
      activeSubject:
        state.activeSubject?.id === subjectId ? null : state.activeSubject,
    }));
  },
  archiveSubject: async (subjectId, archive = true) => {
    const subject = useSubjectStore.getState().subjects.find((s) => s.id === subjectId);
    const goalId = subject?.goal_id || "_";
    const res = await api.patch(`/goals/${goalId}/subjects/${subjectId}/archive`, null, {
      params: { archive },
    });
    set((state) => ({
      subjects: state.subjects.map((s) =>
        s.id === subjectId ? res.data : s
      ),
      activeSubject:
        state.activeSubject?.id === subjectId
          ? res.data
          : state.activeSubject,
    }));
  },
}));
