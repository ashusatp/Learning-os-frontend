"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { User, AuthResponse } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  initialize: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  googleAuth: (code: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  initialized: false,

  initialize: () => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    const userJson = localStorage.getItem("user");

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        set({ token, user, initialized: true });
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        set({ initialized: true });
      }
    } else {
      set({ initialized: true });
    }
  },

  register: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<AuthResponse>("/auth/register", {
        email,
        password,
        name,
      });

      const { access_token, user } = res.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      set({ token: access_token, user, loading: false });
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Registration failed");
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  googleAuth: async (code: string) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<AuthResponse>("/auth/google", { code });
      const { access_token, user } = res.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      set({ token: access_token, user, loading: false });
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Google authentication failed");
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<AuthResponse>("/auth/login", {
        email,
        password,
      });

      const { access_token, user } = res.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      set({ token: access_token, user, loading: false });
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Login failed");
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      const res = await api.get<User>("/auth/me");
      const user = res.data;
      localStorage.setItem("user", JSON.stringify(user));
      set({ user });
    } catch {
      get().logout();
    }
  },

  clearError: () => set({ error: null }),
}));

function getErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as Record<string, unknown>).response === "object"
  ) {
    const response = (err as { response: { data?: { message?: string } } })
      .response;
    if (response.data?.message) {
      return response.data.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}
