import { Databases, Query } from "node-appwrite";
import { appwriteConfig, getCollectionId } from "@/constants/appwriteConfig";
import { createAdminClient } from "@/lib/serverAppwrite";
import { getOpenAIClient, isOpenAIConfigured } from "@/lib/openaiClient";
import {
  checkTopicSimilarityWithAi,
  prefilterCandidates,
} from "@/lib/topicSimilarityAi";
import {
  enrichMatchesFromTopics,
  serializeSimilarityForTopic,
} from "@/lib/topicSimilarityStorage";
import type { TopicSimilarityMatch, VkrTopicDoc } from "@/types";

export async function computeSimilarityForSave(params: {
  title: string;
  departmentId: string;
  excludeTopicId?: string;
  clientMatches?: TopicSimilarityMatch[];
}): Promise<{
  similarityMaxPercent?: number;
  similarityMatchesJson?: string;
  matches: TopicSimilarityMatch[];
}> {
  const trimmed = params.title.trim();
  if (!trimmed) {
    return { matches: [] };
  }

  const dbId = appwriteConfig.databaseId;
  let topics: VkrTopicDoc[] = [];

  if (dbId) {
    const databases = new Databases(createAdminClient());
    const res = await databases.listDocuments(
      dbId,
      getCollectionId("vkr_topics"),
      [Query.equal("departmentId", params.departmentId), Query.limit(500)]
    );
    topics = res.documents as unknown as VkrTopicDoc[];
  }

  if (params.clientMatches && params.clientMatches.length > 0) {
    const enriched = enrichMatchesFromTopics(params.clientMatches, topics);
    const stored = serializeSimilarityForTopic(enriched);
    return { ...stored, matches: enriched };
  }

  if (!isOpenAIConfigured() || !getOpenAIClient()) {
    return { matches: [] };
  }

  if (!dbId) return { matches: [] };

  const candidates = prefilterCandidates(
    trimmed,
    topics,
    params.excludeTopicId,
    20
  );

  const { matches } = await checkTopicSimilarityWithAi({
    newTitle: trimmed,
    candidates,
  });

  const stored = serializeSimilarityForTopic(matches);
  return { ...stored, matches };
}
