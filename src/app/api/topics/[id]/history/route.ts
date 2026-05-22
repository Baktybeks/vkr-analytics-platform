import { NextResponse } from "next/server";
import { Databases, Query } from "node-appwrite";
import { appwriteConfig, getCollectionId } from "@/constants/appwriteConfig";
import { createAdminClient, getSessionProfile } from "@/lib/serverAppwrite";
import type { TopicAuditDoc, VkrTopicDoc } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

async function loadTopic(
  databases: Databases,
  id: string
): Promise<VkrTopicDoc | null> {
  const dbId = appwriteConfig.databaseId;
  if (!dbId) return null;
  try {
    const doc = await databases.getDocument(
      dbId,
      getCollectionId("vkr_topics"),
      id
    );
    return doc as unknown as VkrTopicDoc;
  } catch {
    return null;
  }
}

function canAccessTopic(
  profile: { role: string; departmentId?: string },
  topic: VkrTopicDoc
): boolean {
  if (profile.role === "ADMIN") return true;
  const dept = profile.departmentId?.trim();
  return !!dept && dept === topic.departmentId;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await context.params;
    const dbId = appwriteConfig.databaseId;
    if (!dbId) {
      return NextResponse.json({ error: "База не настроена" }, { status: 500 });
    }

    const adminClient = createAdminClient();
    const databases = new Databases(adminClient);
    const topic = await loadTopic(databases, id);
    if (!topic) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    if (!canAccessTopic(session.profile, topic)) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const res = await databases.listDocuments(
      dbId,
      getCollectionId("topic_audit_log"),
      [
        Query.equal("topicId", id),
        Query.orderDesc("createdAt"),
        Query.limit(100),
      ]
    );

    return NextResponse.json({
      documents: res.documents as unknown as TopicAuditDoc[],
      total: res.total,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
