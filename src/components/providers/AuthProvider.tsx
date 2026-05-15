"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCurrentUser } from "@/services/authService";
import { useSyncAuthCookie } from "@/hooks/useSyncAuthCookie";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const { data, isLoading } = useCurrentUser();
  useSyncAuthCookie();

  useEffect(() => {
    if (isLoading) return;
    if (data) setUser(data);
    else clearUser();
  }, [data, isLoading, setUser, clearUser]);

  return <>{children}</>;
}
