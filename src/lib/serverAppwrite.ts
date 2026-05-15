import { Client, Account, Databases, Users } from "node-appwrite";
import { cookies, headers } from "next/headers";
import type { ProfileDoc } from "@/types";
import { appwriteConfig, getCollectionId } from "@/constants/appwriteConfig";

export function createAdminClient(): Client {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) throw new Error("APPWRITE_API_KEY не задан");
  return new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)
    .setKey(key);
}

/**
 * Извлекает секрет сессии из заголовка X-Fallback-Cookies (как в Web SDK Appwrite).
 */
export function parseSessionFromFallback(
  raw: string,
  projectId: string
): string | null {
  const s = raw.trim();
  if (!s || !projectId) return null;
  try {
    const data = JSON.parse(s) as Record<string, unknown>;
    if (data && typeof data === "object") {
      const keys = [
        `a_session_${projectId}`,
        `a_session_${projectId.toLowerCase()}`,
      ];
      for (const key of keys) {
        const v = data[key];
        if (typeof v === "string" && v) return v;
      }
      for (const [k, v] of Object.entries(data)) {
        if (k.startsWith("a_session_") && typeof v === "string" && v) {
          return v;
        }
      }
    }
  } catch {
    /* не JSON */
  }
  const m = s.match(/a_session_[^=;\s]+=([^;\s]+)/);
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
  return null;
}

export async function getSessionSecret(): Promise<string | null> {
  const h = await headers();
  const xs = h.get("x-appwrite-session")?.trim();
  if (xs) return xs;

  const xf = h.get("x-fallback-cookies")?.trim();
  if (xf && appwriteConfig.projectId) {
    const fromFallback = parseSessionFromFallback(xf, appwriteConfig.projectId);
    if (fromFallback) return fromFallback;
  }

  const jar = await cookies();
  const projectId = appwriteConfig.projectId || "";
  if (projectId) {
    const cookieNames = [
      `a_session_${projectId}`,
      `a_session_${projectId.toLowerCase()}`,
    ];
    for (const name of cookieNames) {
      const c = jar.get(name);
      if (c?.value) return c.value;
    }
  }
  for (const c of jar.getAll()) {
    if (c.name.startsWith("a_session_") && c.value) return c.value;
  }
  return null;
}

export async function createSessionClient(): Promise<Client | null> {
  const secret = await getSessionSecret();
  if (!secret) return null;
  return new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)
    .setSession(secret);
}

export async function getAccountUserId(): Promise<string | null> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return null;
  try {
    const account = new Account(sessionClient);
    const u = await account.get();
    return u.$id;
  } catch {
    return null;
  }
}

export async function getProfileByUserId(
  userId: string
): Promise<ProfileDoc | null> {
  const admin = createAdminClient();
  const databases = new Databases(admin);
  const db = appwriteConfig.databaseId;
  if (!db) return null;
  try {
    const doc = await databases.getDocument(
      db,
      getCollectionId("profiles"),
      userId
    );
    return doc as unknown as ProfileDoc;
  } catch {
    return null;
  }
}

export async function getSessionProfile(): Promise<{
  userId: string;
  profile: ProfileDoc;
} | null> {
  const userId = await getAccountUserId();
  if (!userId) return null;
  const profile = await getProfileByUserId(userId);
  if (!profile) return null;
  return { userId, profile };
}

export function getUsersService() {
  return new Users(createAdminClient());
}
