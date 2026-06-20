import { create } from "zustand";
import api from "@/lib/api";
import { Question, PaginatedResponse } from "@/types";

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
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  fetchQuestions: (subtopicId: string, page?: number, pageSize?: number) => Promise<void>;
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

export const useQuestionStore = create<QuestionState>((set, get) => ({
  questions: [],
  loading: false,
  error: null,
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
  fetchQuestions: async (subtopicId, page, pageSize) => {
    const p = page ?? get().page;
    const ps = pageSize ?? get().pageSize;
    set({ loading: true, error: null });
    try {
      const res = await api.get<PaginatedResponse<Question>>(
        `/subtopics/${subtopicId}/questions`,
        { params: { page: p, page_size: ps } }
      );
      set({
        questions: res.data.items,
        total: res.data.total,
        page: res.data.page,
        pageSize: res.data.page_size,
        totalPages: res.data.total_pages,
        loading: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch questions";
      set({ error: message, loading: false });
    }
  },
  createQuestion: async (subtopicId, data) => {
    const res = await api.post(`/subtopics/${subtopicId}/questions`, data);
    // Refetch current page to keep pagination in sync
    const { page, pageSize } = get();
    get().fetchQuestions(subtopicId, page, pageSize);
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
    // Refetch current page
    const { page, pageSize } = get();
    get().fetchQuestions(subtopicId, page, pageSize);
  },
  reorderQuestions: async (subtopicId, orderedIds) => {
    await api.put(`/subtopics/${subtopicId}/questions/reorder`, {
      ordered_ids: orderedIds,
    });
  },
  setQuestions: (questions) => set({ questions }),
}));
