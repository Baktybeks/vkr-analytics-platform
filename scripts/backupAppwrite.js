/**
 * Резервная копия коллекций Appwrite в backups/
 * npm run db:backup
 */
const fs = require("fs");
const path = require("path");
const { Client, Databases, Query } = require("node-appwrite");
require("dotenv").config({ path: ".env.local" });

const appwriteConfig = {
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
};

const client = new Client();
client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function listAll(databaseId, collectionId) {
  const all = [];
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

async function main() {
  if (!appwriteConfig.databaseId || !process.env.APPWRITE_API_KEY) {
    console.error("Нужны NEXT_PUBLIC_APPWRITE_DATABASE_ID и APPWRITE_API_KEY");
    process.exit(1);
  }

  const collections = {};
  for (const [name, id] of Object.entries(appwriteConfig.collections)) {
    try {
      collections[name] = await listAll(appwriteConfig.databaseId, id);
      console.log(`${name}: ${collections[name].length} документов`);
    } catch (e) {
      console.log(`${name}: пропуск (${e.message})`);
      collections[name] = [];
    }
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    databaseId: appwriteConfig.databaseId,
    collections,
  };

  const dir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const file = path.join(dir, `backup-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  console.log(`\nСохранено: ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
