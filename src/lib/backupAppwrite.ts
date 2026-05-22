import { Databases, Query } from "node-appwrite";
import { appwriteConfig } from "@/constants/appwriteConfig";
import { createAdminClient } from "@/lib/serverAppwrite";

const COLLECTION_KEYS = [
  "departments",
  "profiles",
  "vkr_topics",
  "topic_audit_log",
] as const;

async function listAllDocuments(
  databases: Databases,
  databaseId: string,
  collectionId: string
): Promise<unknown[]> {
  const all: unknown[] = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const page = await databases.listDocuments(databaseId, collectionId, [
      Query.limit(limit),
      Query.offset(offset),
    ]);
    all.push(...page.documents);
    if (page.documents.length < limit) break;
    offset += limit;
  }
  return all;
}

export async function exportAppwriteBackup(): Promise<{
  exportedAt: string;
  databaseId: string;
  collections: Record<string, unknown[]>;
}> {
  const databaseId = appwriteConfig.databaseId;
  if (!databaseId) throw new Error("База не настроена");

  const databases = new Databases(createAdminClient());
  const collections: Record<string, unknown[]> = {};

  for (const key of COLLECTION_KEYS) {
    const collectionId = appwriteConfig.collections[key];
    if (!collectionId) continue;
    try {
      collections[key] = await listAllDocuments(
        databases,
        databaseId,
        collectionId
      );
    } catch {
      collections[key] = [];
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    databaseId,
    collections,
  };
}
