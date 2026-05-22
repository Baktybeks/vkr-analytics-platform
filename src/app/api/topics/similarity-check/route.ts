import { NextResponse } from "next/server";
import { Databases, Query } from "node-appwrite";
import { appwriteConfig, getCollectionId } from "@/constants/appwriteConfig";
import { createAdminClient, getSessionProfile } from "@/lib/serverAppwrite";
import { getOpenAIClient } from "@/lib/openaiClient";
import {
  checkTopicSimilarityWithAi,
  prefilterCandidates,
} from "@/lib/topicSimilarityAi";
import type { VkrTopicDoc } from "@/types";

export async function POST(request: Request) {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    if (!getOpenAIClient()) {
      return NextResponse.json(
        {
          error:
            "Проверка ИИ недоступна: задайте OPENAI_API_KEY в .env на сервере",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as {
      title?: string;
      excludeTopicId?: string;
      departmentId?: string;
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json(
        { error: "Укажите название темы" },
        { status: 400 }
      );
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

    const databases = new Databases(createAdminClient());
    const res = await databases.listDocuments(
      dbId,
      getCollectionId("vkr_topics"),
      [
        Query.equal("departmentId", departmentId),
        Query.limit(500),
      ]
    );

    const topics = res.documents as unknown as VkrTopicDoc[];
    const candidates = prefilterCandidates(
      title,
      topics,
      body.excludeTopicId?.trim(),
      20
    );

    const result = await checkTopicSimilarityWithAi({
      newTitle: title,
      candidates,
    });

    return NextResponse.json({
      ...result,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка проверки";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
