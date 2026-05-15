import { create } from "zustand";
import type { AuthUser } from "@/types";

type AuthState = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
