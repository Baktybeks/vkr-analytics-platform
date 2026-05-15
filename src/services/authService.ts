"use client";

import { appwriteConfig } from "@/constants/appwriteConfig";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID } from "appwrite";
import type { AuthUser, ProfileDoc } from "@/types";
import { writeAuthCookie } from "@/hooks/useSyncAuthCookie";
import { useAuthStore } from "@/store/authStore";
import { account, databases } from "./appwriteClient";

const { databaseId: DATABASE_ID, collections } = appwriteConfig;

const profilesCollection = collections.profiles;

export const authKeys = {
  session: ["auth", "session"] as const,
};

function profileToAuthUser(
  session: { $id: string; email: string },
  profile: ProfileDoc
): AuthUser {
  return {
    $id: session.$id,
    email: session.email,
    name: profile.fullName,
    role: profile.role,
    departmentId: profile.departmentId?.trim() || null,
    isActive: true,
  };
}

async function fetchProfile(userId: string): Promise<ProfileDoc | null> {
  try {
    const doc = await databases.getDocument(
      DATABASE_ID,
      profilesCollection,
      userId
    );
    return doc as unknown as ProfileDoc;
  } catch {
    return null;
  }
}

export const authApi = {
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!DATABASE_ID || !appwriteConfig.projectId) return null;
    try {
      const session = await account.get();
      const profile = await fetchProfile(session.$id);
      if (!profile) return null;
      return profileToAuthUser(session, profile);
    } catch {
      return null;
    }
  },

  async register(
    fullName: string,
    email: string,
    password: string
  ): Promise<AuthUser> {
    let hasAdmin = true;
    try {
      const bootstrapRes = await fetch("/api/bootstrap/has-admin", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (bootstrapRes.ok) {
        const body = (await bootstrapRes.json()) as { hasAdmin?: boolean };
        hasAdmin = body.hasAdmin === true;
      }
    } catch {
      hasAdmin = true;
    }

    if (hasAdmin) {
      throw new Error(
        "Регистрация закрыта. Обратитесь к администратору системы."
      );
    }

    const authUser = await account.create({
      userId: ID.unique(),
      email,
      password,
      name: fullName,
    });

    await account.createEmailPasswordSession({ email, password });

    await databases.createDocument(
      DATABASE_ID,
      profilesCollection,
      authUser.$id,
      {
        userId: authUser.$id,
        fullName,
        role: "ADMIN",
        createdAt: new Date().toISOString(),
      }
    );
    return {
      $id: authUser.$id,
      email: authUser.email,
      name: fullName,
      role: "ADMIN",
      departmentId: null,
      isActive: true,
    };
  },

  async login(email: string, password: string): Promise<AuthUser> {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch {
      /* no session */
    }
    await account.createEmailPasswordSession({ email, password });
    const u = await this.getCurrentUser();
    if (!u)
      throw new Error(
        "Нет профиля в коллекции profiles для этого аккаунта"
      );
    if (u.role === "OPERATOR" && !u.departmentId) {
      throw new Error(
        "У оператора не указана кафедра. Обратитесь к администратору."
      );
    }
    return u;
  },

  async logout(): Promise<void> {
    await account.deleteSession({ sessionId: "current" });
  },
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.session,
    queryFn: () => authApi.getCurrentUser(),
    staleTime: 1000 * 60,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (user) => {
      qc.setQueryData(authKeys.session, user);
      useAuthStore.getState().setUser(user);
      writeAuthCookie(user);
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      fullName,
      email,
      password,
    }: {
      fullName: string;
      email: string;
      password: string;
    }) => authApi.register(fullName, email, password),
    onSuccess: (user) => {
      qc.setQueryData(authKeys.session, user);
      useAuthStore.getState().setUser(user);
      writeAuthCookie(user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      qc.setQueryData(authKeys.session, null);
      useAuthStore.getState().clearUser();
      writeAuthCookie(null);
    },
  });
}
