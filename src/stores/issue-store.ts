import { create } from "zustand";
import api from "@/lib/api";
import { Issue } from "@/types";

interface IssueState {
  issues: Issue[];
  loading: boolean;
  error: string | null;
  fetchIssues: () => Promise<void>;
  resolveIssue: (issueId: string) => Promise<void>;
  reopenIssue: (issueId: string) => Promise<void>;
}

export const useIssueStore = create<IssueState>((set) => ({
  issues: [],
  loading: false,
  error: null,
  fetchIssues: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get("/issues");
      set({ issues: res.data, loading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch issues";
      set({ error: message, loading: false });
    }
  },
  resolveIssue: async (issueId) => {
    const res = await api.patch(`/issues/${issueId}/resolve`);
    set((state) => ({
      issues: state.issues.map((i) => (i.id === issueId ? res.data : i)),
    }));
  },
  reopenIssue: async (issueId) => {
    const res = await api.patch(`/issues/${issueId}/reopen`);
    set((state) => ({
      issues: state.issues.map((i) => (i.id === issueId ? res.data : i)),
    }));
  },
}));
