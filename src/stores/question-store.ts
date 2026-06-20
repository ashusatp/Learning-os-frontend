import { create } from "zustand";
import api from "@/lib/api";
import { Question } from "@/types";

interface CreateOptionData {
  text_html: string;
  is_correct?: boolean;
  order?: number;
}

interface UpdateOptionData {
  id?: string | null;
  text_html: string;
  is_correct?: boolean;
  order?: number;
}

interface CreateQuestionData {
  question_type?: string;
  text_html: string;
  explanation_html?: string | null;
  difficulty?: string;
  marks?: number;
  negative_marks?: number;
  numerical_answer?: number | null;
  numerical_tolerance?: number | null;
  answer_html?: string | null;
  is_pyq?: boolean;
  tags?: string[];
  order?: number;
  options?: CreateOptionData[];
}

interface UpdateQuestionData {
  question_type?: string;
  text_html?: string;
  explanation_html?: string | null;
  difficulty?: string;
  marks?: number;
  negative_marks?: number;
  numerical_answer?: number | null;
  numerical_tolerance?: number | null;
  answer_html?: string | null;
  is_pyq?: boolean;
  tags?: string[];
  order?: number;
  options?: UpdateOptionData[];
}

interface QuestionState {
  questions: Question[];
  loading: boolean;
  error: string | null;
  fetchQuestions: (subtopicId: string) => Promise<void>;
  createQuestion: (
    subtopicId: string,
    data: CreateQuestionData
  ) => Promise<Question>;
  updateQuestion: (
    subtopicId: string,
    questionId: string,
    data: UpdateQuestionData
  ) => Promise<Question>;
  deleteQuestion: (subtopicId: string, questionId: string) => Promise<void>;
  reorderQuestions: (subtopicId: string, orderedIds: string[]) => Promise<void>;
  setQuestions: (questions: Question[]) => void;
}

export const useQuestionStore = create<QuestionState>((set) => ({
  questions: [],
  loading: false,
  error: null,
  fetchQuestions: async (subtopicId) => {
    set({ loading: true, error: null, questions: [] });
    try {
      const res = await api.get(`/subtopics/${subtopicId}/questions`);
      set({ questions: res.data, loading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch questions";
      set({ error: message, loading: false });
    }
  },
  createQuestion: async (subtopicId, data) => {
    const res = await api.post(`/subtopics/${subtopicId}/questions`, data);
    set((state) => ({ questions: [...state.questions, res.data] }));
    return res.data;
  },
  updateQuestion: async (subtopicId, questionId, data) => {
    const res = await api.put(
      `/subtopics/${subtopicId}/questions/${questionId}`,
      data
    );
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === questionId ? res.data : q
      ),
    }));
    return res.data;
  },
  deleteQuestion: async (subtopicId, questionId) => {
    await api.delete(`/subtopics/${subtopicId}/questions/${questionId}`);
    set((state) => ({
      questions: state.questions.filter((q) => q.id !== questionId),
    }));
  },
  reorderQuestions: async (subtopicId, orderedIds) => {
    await api.put(`/subtopics/${subtopicId}/questions/reorder`, {
      ordered_ids: orderedIds,
    });
  },
  setQuestions: (questions) => set({ questions }),
}));
