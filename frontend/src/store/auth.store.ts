import { create } from "zustand";
import type { User } from "../types/auth";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  setSession: (user: User, accessToken: string) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setSession: (user, accessToken) => set({ user, accessToken }),
  clearSession: () => set({ user: null, accessToken: null }),
}));
