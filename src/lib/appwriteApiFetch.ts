"use client";

import { client } from "@/services/appwriteClient";

/**
 * Заголовки для запросов к собственным API Next.js: Appwrite Web SDK часто
 * хранит сессию в localStorage (cookieFallback), а не в HTTP-cookie — без
 * этих заголовков сервер не сможет вызвать Account.get().
 */
export function getAppwriteForwardedAuthHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const cfg = client as unknown as { config?: { session?: string } };
  if (cfg.config?.session) {
    h["X-Appwrite-Session"] = cfg.config.session;
  }
  if (typeof window !== "undefined") {
    const fb = window.localStorage.getItem("cookieFallback");
    if (fb) {
      h["X-Fallback-Cookies"] = fb;
    }
  }
  return h;
}

export function appwriteApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  for (const [k, v] of Object.entries(getAppwriteForwardedAuthHeaders())) {
    if (v && !headers.has(k)) {
      headers.set(k, v);
    }
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
    cache: init?.cache ?? "no-store",
  });
}
