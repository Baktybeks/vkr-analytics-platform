import { NextResponse } from "next/server";
import { Databases, Query } from "node-appwrite";
import { appwriteConfig, getCollectionId } from "@/constants/appwriteConfig";
import { createAdminClient, getSessionProfile } from "@/lib/serverAppwrite";
import { normalizeTopicTitle } from "@/lib/normalizeTopicTitle";
import { buildTopicDiff, writeTopicAudit } from "@/lib/topicAudit";
import { computeSimilarityForSave } from "@/lib/runTopicSimilarityForSave";
import type { TopicSimilarityMatch, VkrTopicDoc } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

async function loadTopic(databases: Databases, id: string): Promise<VkrTopicDoc | null> {
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

export async function PATCH(request: Request, context: RouteContext) {
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

    const body = (await request.json()) as {
      title?: string;
      studentName?: string;
      studentGroup?: string;
      supervisorName?: string;
      year?: string;
      notes?: string;
      departmentId?: string;
      similarityMatches?: TopicSimilarityMatch[];
    };

    let title = topic.title;
    if (body.title !== undefined) {
      const t = body.title.trim();
      if (!t) {
        return NextResponse.json({ error: "Пустое название" }, { status: 400 });
      }
      title = t;
    }

    let departmentId = topic.departmentId;
    if (session.profile.role === "ADMIN" && body.departmentId !== undefined) {
      const d = body.departmentId.trim();
      if (!d) {
        return NextResponse.json({ error: "Пустая кафедра" }, { status: 400 });
      }
      try {
        await databases.getDocument(
          dbId,
          getCollectionId("departments"),
          d
        );
      } catch {
        return NextResponse.json({ error: "Кафедра не найдена" }, { status: 400 });
      }
      departmentId = d;
    }

    const normalizedTitle = normalizeTopicTitle(title);
    if (!normalizedTitle) {
      return NextResponse.json(
        { error: "Слишком короткое название после нормализации" },
        { status: 400 }
      );
    }

    if (
      normalizedTitle !== topic.normalizedTitle ||
      departmentId !== topic.departmentId
    ) {
      const dup = await databases.listDocuments(
        dbId,
        getCollectionId("vkr_topics"),
        [
          Query.equal("departmentId", departmentId),
          Query.equal("normalizedTitle", normalizedTitle),
          Query.limit(5),
        ]
      );
      const other = dup.documents.find((d) => d.$id !== id);
      if (other) {
        return NextResponse.json(
          { error: "Тема с такой формулировкой уже есть на кафедре" },
          { status: 409 }
        );
      }
    }

    const studentName =
      body.studentName !== undefined
        ? body.studentName.trim()
        : topic.studentName;
    const studentGroup =
      body.studentGroup !== undefined
        ? body.studentGroup.trim()
        : topic.studentGroup;
    const supervisorName =
      body.supervisorName !== undefined
        ? body.supervisorName.trim()
        : topic.supervisorName;
    const year =
      body.year !== undefined ? body.year.trim() : topic.year;
    const notes =
      body.notes !== undefined ? body.notes.trim() : topic.notes;

    const titleChanged =
      normalizedTitle !== topic.normalizedTitle ||
      departmentId !== topic.departmentId;
    const shouldRefreshSimilarity =
      titleChanged || (body.similarityMatches?.length ?? 0) > 0;

    let similarityFields: {
      similarityMaxPercent?: number;
      similarityMatchesJson?: string;
    } = {};
    if (shouldRefreshSimilarity) {
      const similarity = await computeSimilarityForSave({
        title,
        departmentId,
        excludeTopicId: id,
        clientMatches: body.similarityMatches,
      });
      similarityFields = {
        similarityMaxPercent: similarity.similarityMaxPercent,
        similarityMatchesJson: similarity.similarityMatchesJson,
      };
    }

    const patchPayload = {
      title,
      normalizedTitle,
      departmentId,
      studentName,
      studentGroup,
      supervisorName,
      year,
      notes,
      updatedByUserId: session.userId,
      updatedAt: new Date().toISOString(),
      ...similarityFields,
    };

    const diff = buildTopicDiff(topic, patchPayload);

    const updated = await databases.updateDocument(
      dbId,
      getCollectionId("vkr_topics"),
      id,
      patchPayload
    );

    if (diff.length > 0) {
      await writeTopicAudit({
        topicId: id,
        departmentId,
        action: "update",
        userId: session.userId,
        userName: session.profile.fullName,
        changes: diff,
      });
    }

    return NextResponse.json(updated);
  } catch (e) {
    const err = e as { message?: string; code?: number };
    const msg = err.message || "Ошибка обновления";
    const status = err.code === 409 ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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

    await writeTopicAudit({
      topicId: id,
      departmentId: topic.departmentId,
      action: "delete",
      userId: session.userId,
      userName: session.profile.fullName,
      changes: { snapshot: { title: topic.title } },
    });

    await databases.deleteDocument(
      dbId,
      getCollectionId("vkr_topics"),
      id
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка удаления";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
