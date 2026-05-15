"use client";

import { ID } from "appwrite";
import { databases } from "@/services/appwriteClient";
import { appwriteApiFetch } from "@/lib/appwriteApiFetch";
import { appwriteConfig, getCollectionId } from "@/constants/appwriteConfig";
import type { DepartmentDoc } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/services/authService";

const db = appwriteConfig.databaseId;
const coll = getCollectionId("departments");

export const departmentKeys = {
  all: ["departments"] as const,
};

async function listDepartmentsFromApi(): Promise<DepartmentDoc[]> {
  const res = await appwriteApiFetch("/api/departments", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Ошибка загрузки кафедр");
  }
  const data = (await res.json()) as { documents?: DepartmentDoc[] };
  return (data.documents ?? []) as DepartmentDoc[];
}

export function useDepartments() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: [...departmentKeys.all, user?.$id ?? "anon", user?.role ?? "none"],
    queryFn: listDepartmentsFromApi,
    enabled: !!user,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; code?: string }) => {
      if (!db) throw new Error("База не настроена");
      return databases.createDocument(db, coll, ID.unique(), {
        name: payload.name.trim(),
        code: payload.code?.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentKeys.all }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      name: string;
      code?: string;
    }) => {
      if (!db) throw new Error("База не настроена");
      return databases.updateDocument(db, coll, payload.id, {
        name: payload.name.trim(),
        code: payload.code?.trim() || undefined,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentKeys.all }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!db) throw new Error("База не настроена");
      await databases.deleteDocument(db, coll, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentKeys.all }),
  });
}
