export const appwriteConfig = {
  endpoint:
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "",
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "",
  collections: {
    departments:
      process.env.NEXT_PUBLIC_DEPARTMENTS_COLLECTION_ID || "departments",
    profiles: process.env.NEXT_PUBLIC_PROFILES_COLLECTION_ID || "profiles",
    vkr_topics:
      process.env.NEXT_PUBLIC_VKR_TOPICS_COLLECTION_ID || "vkr_topics",
    topic_audit_log:
      process.env.NEXT_PUBLIC_TOPIC_AUDIT_COLLECTION_ID || "topic_audit_log",
  },
} as const;

export type CollectionName = keyof typeof appwriteConfig.collections;

export const getCollectionId = (name: CollectionName): string => {
  const id = appwriteConfig.collections[name];
  if (!id) throw new Error(`Коллекция ${name} не настроена`);
  return id;
};
