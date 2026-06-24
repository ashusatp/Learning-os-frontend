import { create } from "zustand";
import api from "@/lib/api";
import { SketchBoard } from "@/types";

interface SketchBoardState {
  boards: SketchBoard[];
  activeBoard: SketchBoard | null;
  loading: boolean;
  fetchBoards: (topicId: string, subtopicId: string) => Promise<void>;
  setActiveBoard: (board: SketchBoard | null) => void;
  createBoard: (topicId: string, subtopicId: string, name: string) => Promise<SketchBoard>;
  updateBoard: (topicId: string, subtopicId: string, boardId: string, data: { name?: string; data?: string | null }) => Promise<void>;
  renameBoard: (topicId: string, subtopicId: string, boardId: string, name: string) => Promise<void>;
  deleteBoard: (topicId: string, subtopicId: string, boardId: string) => Promise<void>;
}

export const useSketchBoardStore = create<SketchBoardState>((set) => ({
  boards: [],
  activeBoard: null,
  loading: false,

  fetchBoards: async (topicId, subtopicId) => {
    set({ loading: true });
    try {
      const res = await api.get(`/topics/${topicId}/subtopics/${subtopicId}/sketch-boards`);
      set({ boards: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setActiveBoard: (board) => set({ activeBoard: board }),

  createBoard: async (topicId, subtopicId, name) => {
    const res = await api.post(`/topics/${topicId}/subtopics/${subtopicId}/sketch-boards`, { name });
    set((state) => ({ boards: [...state.boards, res.data] }));
    return res.data;
  },

  updateBoard: async (topicId, subtopicId, boardId, data) => {
    const res = await api.put(`/topics/${topicId}/subtopics/${subtopicId}/sketch-boards/${boardId}`, data);
    set((state) => ({
      boards: state.boards.map((b) => (b.id === boardId ? res.data : b)),
      activeBoard: state.activeBoard?.id === boardId ? res.data : state.activeBoard,
    }));
  },

  renameBoard: async (topicId, subtopicId, boardId, name) => {
    const res = await api.patch(`/topics/${topicId}/subtopics/${subtopicId}/sketch-boards/${boardId}/rename`, { name });
    set((state) => ({
      boards: state.boards.map((b) => (b.id === boardId ? res.data : b)),
      activeBoard: state.activeBoard?.id === boardId ? res.data : state.activeBoard,
    }));
  },

  deleteBoard: async (topicId, subtopicId, boardId) => {
    await api.delete(`/topics/${topicId}/subtopics/${subtopicId}/sketch-boards/${boardId}`);
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== boardId),
      activeBoard: state.activeBoard?.id === boardId ? null : state.activeBoard,
    }));
  },
}));
