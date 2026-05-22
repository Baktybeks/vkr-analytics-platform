import { ID, Databases } from "node-appwrite";
import { appwriteConfig, getCollectionId } from "@/constants/appwriteConfig";
import { createAdminClient } from "@/lib/serverAppwrite";
import type { TopicAuditAction, VkrTopicDoc } from "@/types";

export type AuditChangeEntry = {
  field: string;
  from?: string | null;
  to?: string | null;
};

export async function writeTopicAudit(params: {
  topicId: string;
  departmentId: string;
  action: TopicAuditAction;
  userId: string;
  userName: string;
  changes?: AuditChangeEntry[] | { snapshot: Partial<VkrTopicDoc> };
}): Promise<void> {
  const dbId = appwriteConfig.databaseId;
  if (!dbId) return;

  const databases = new Databases(createAdminClient());
  const changesStr = params.changes
    ? JSON.stringify(params.changes)
    : undefined;

  try {
    await databases.createDocument(
      dbId,
      getCollectionId("topic_audit_log"),
      ID.unique(),
      {
        topicId: params.topicId,
        departmentId: params.departmentId,
        action: params.action,
        userId: params.userId,
        userName: params.userName,
        changes: changesStr,
        createdAt: new Date().toISOString(),
      }
    );
  } catch (e) {
    console.error("topic_audit write failed:", e);
  }
}

const AUDIT_FIELDS = [
  "title",
  "studentName",
  "studentGroup",
  "supervisorName",
  "year",
  "notes",
  "departmentId",
] as const;

export function buildTopicDiff(
  before: VkrTopicDoc,
  after: Partial<VkrTopicDoc>
): AuditChangeEntry[] {
  const changes: AuditChangeEntry[] = [];
  for (const field of AUDIT_FIELDS) {
    const prev = before[field as keyof VkrTopicDoc];
    if (after[field as keyof VkrTopicDoc] === undefined) continue;
    const next = after[field as keyof VkrTopicDoc];
    const prevStr =
      prev === undefined || prev === null ? null : String(prev);
    const nextStr =
      next === undefined || next === null ? null : String(next);
    if (prevStr !== nextStr) {
      changes.push({ field, from: prevStr, to: nextStr });
    }
  }
  return changes;
}
