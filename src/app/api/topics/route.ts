import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ID, Query, Databases } from "node-appwrite";
import { appwriteConfig, getCollectionId } from "@/constants/appwriteConfig";
import { createAdminClient, getSessionProfile } from "@/lib/serverAppwrite";
import { normalizeTopicTitle } from "@/lib/normalizeTopicTitle";
import { writeTopicAudit } from "@/lib/topicAudit";
import { computeSimilarityForSave } from "@/lib/runTopicSimilarityForSave";
import type { TopicSimilarityMatch } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const dbId = appwriteConfig.databaseId;
    if (!dbId) {
      return NextResponse.json({ error: "База не настроена" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const filterDept = searchParams.get("departmentId")?.trim() || null;

    let departmentId: string | null = null;
    if (session.profile.role === "OPERATOR") {
      const mine = session.profile.departmentId?.trim() || null;
      if (!mine) {
        return NextResponse.json(
          { error: "У профиля не задана кафедра" },
          { status: 403 }
        );
      }
      if (filterDept && filterDept !== mine) {
        return NextResponse.json(
          { error: "Нельзя запрашивать темы другой кафедры" },
          { status: 403 }
        );
      }
      departmentId = mine;
    } else {
      departmentId = filterDept;
    }

    const adminClient = createAdminClient();
    const databases = new Databases(adminClient);
    const queries: string[] = [];
    if (departmentId) {
      queries.push(Query.equal("departmentId", departmentId));
    } else if (session.profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
    queries.push(Query.orderDesc("$createdAt"));
    queries.push(Query.limit(500));

    const res = await databases.listDocuments(
      dbId,
      getCollectionId("vkr_topics"),
      queries
    );

    return NextResponse.json(res);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
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

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Укажите название темы" }, { status: 400 });
    }

    let departmentId: string;
    if (session.profile.role === "OPERATOR") {
      const d = session.profile.departmentId?.trim();
      if (!d) {
        return NextResponse.json(
          { error: "У оператора не задана кафедра" },
          { status: 403 }
        );
      }
      departmentId = d;
    } else {
      const d = body.departmentId?.trim();
      if (!d) {
        return NextResponse.json(
          { error: "Укажите кафедру (departmentId)" },
          { status: 400 }
        );
      }
      departmentId = d;
    }

    const dbId = appwriteConfig.databaseId;
    if (!dbId) {
      return NextResponse.json({ error: "База не настроена" }, { status: 500 });
    }

    const adminClient = createAdminClient();
    const databases = new Databases(adminClient);

    try {
      await databases.getDocument(
        dbId,
        getCollectionId("departments"),
        departmentId
      );
    } catch {
      return NextResponse.json({ error: "Кафедра не найдена" }, { status: 400 });
    }

    const normalizedTitle = normalizeTopicTitle(title);
    if (!normalizedTitle) {
      return NextResponse.json(
        { error: "Слишком короткое название после нормализации" },
        { status: 400 }
      );
    }

    const similarity = await computeSimilarityForSave({
      title,
      departmentId,
      clientMatches: body.similarityMatches,
    });

    const now = new Date().toISOString();
    const doc = await databases.createDocument(
      dbId,
      getCollectionId("vkr_topics"),
      ID.unique(),
      {
        title,
        normalizedTitle,
        departmentId,
        createdByUserId: session.userId,
        studentName: body.studentName?.trim() || undefined,
        studentGroup: body.studentGroup?.trim() || undefined,
        supervisorName: body.supervisorName?.trim() || undefined,
        year: body.year?.trim() || undefined,
        notes: body.notes?.trim() || undefined,
        updatedByUserId: session.userId,
        similarityMaxPercent: similarity.similarityMaxPercent,
        similarityMatchesJson: similarity.similarityMatchesJson,
        createdAt: now,
        updatedAt: now,
      }
    );

    await writeTopicAudit({
      topicId: doc.$id,
      departmentId,
      action: "create",
      userId: session.userId,
      userName: session.profile.fullName,
      changes: {
        snapshot: {
          title: doc.title,
          studentName: doc.studentName,
          studentGroup: doc.studentGroup,
          supervisorName: doc.supervisorName,
          year: doc.year,
          notes: doc.notes,
        },
      },
    });

    return NextResponse.json(doc);
  } catch (e) {
    const err = e as { message?: string; code?: number };
    const msg = err.message || "Ошибка сохранения";
    const status = err.code === 409 ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
