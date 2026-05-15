"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import type { AuthUser } from "@/types";

export function writeAuthCookie(user: AuthUser | null) {
  if (typeof document === "undefined") return;
  if (user) {
    const authData = { state: { user } };
    const cookieValue = encodeURIComponent(JSON.stringify(authData));
    document.cookie = `auth-storage=${cookieValue}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie =
      "auth-storage=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  }
}

export function useSyncAuthCookie() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    writeAuthCookie(user);
  }, [user]);
}
