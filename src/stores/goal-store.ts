import { create } from "zustand";
import api from "@/lib/api";
import { Goal } from "@/types";

interface GoalState {
  goals: Goal[];
  activeGoal: Goal | null;
  loading: boolean;
  error: string | null;
  fetchGoals: (userId: string) => Promise<void>;
  setActiveGoal: (goal: Goal) => void;
  createGoal: (userId: string, data: Partial<Goal>) => Promise<Goal>;
  updateGoal: (goalId: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set) => ({
  goals: [],
  activeGoal: null,
  loading: false,
  error: null,
  fetchGoals: async (userId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/users/${userId}/goals`);
      set({ goals: res.data, loading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch goals";
      set({ error: message, loading: false });
    }
  },
  setActiveGoal: (goal) => set({ activeGoal: goal }),
  createGoal: async (userId, data) => {
    const res = await api.post(`/users/${userId}/goals`, data);
    set((state) => ({ goals: [...state.goals, res.data] }));
    return res.data;
  },
  updateGoal: async (goalId, data) => {
    const res = await api.put(`/goals/${goalId}`, data);
    set((state) => ({
      goals: state.goals.map((g) => (g.id === goalId ? res.data : g)),
      activeGoal:
        state.activeGoal?.id === goalId ? res.data : state.activeGoal,
    }));
  },
  deleteGoal: async (goalId) => {
    await api.delete(`/goals/${goalId}`);
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== goalId),
      activeGoal:
        state.activeGoal?.id === goalId ? null : state.activeGoal,
    }));
  },
}));
