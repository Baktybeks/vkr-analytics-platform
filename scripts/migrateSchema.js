/**
 * Миграция схемы для уже существующей БД Appwrite:
 * добавляет новые атрибуты в vkr_topics и создаёт topic_audit_log.
 * node scripts/migrateSchema.js
 */
const { Client, Databases, Permission, Role } = require("node-appwrite");
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

const NEW_VKR_ATTRIBUTES = {
  studentGroup: { type: "string", required: false, size: 64 },
  updatedByUserId: { type: "string", required: false, size: 36 },
  similarityMaxPercent: { type: "integer", required: false, min: 0, max: 100 },
  similarityMatchesJson: { type: "string", required: false, size: 8000 },
};

const TOPIC_AUDIT_SCHEMA = {
  topicId: { type: "string", required: true, size: 36 },
  departmentId: { type: "string", required: true, size: 36 },
  action: {
    type: "enum",
    required: true,
    elements: ["create", "update", "delete"],
  },
  userId: { type: "string", required: true, size: 36 },
  userName: { type: "string", required: true, size: 255 },
  changes: { type: "string", required: false, size: 8000 },
  createdAt: { type: "datetime", required: true },
};

const TOPIC_AUDIT_INDEXES = [
  { key: "topicId", type: "key" },
  { key: "departmentId", type: "key" },
  { key: "createdAt", type: "key" },
];

const client = new Client();
client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const createAttribute = async (databaseId, collectionId, key, schema) => {
  const isRequired = schema.required || false;
  switch (schema.type) {
    case "string":
      await databases.createStringAttribute({
        databaseId,
        collectionId,
        key,
        size: schema.size || 255,
        required: isRequired,
        array: false,
      });
      break;
    case "enum":
      await databases.createEnumAttribute({
        databaseId,
        collectionId,
        key,
        elements: schema.elements,
        required: isRequired,
        array: false,
      });
      break;
    case "datetime":
      await databases.createDatetimeAttribute({
        databaseId,
        collectionId,
        key,
        required: isRequired,
        array: false,
      });
      break;
    case "integer":
      await databases.createIntegerAttribute({
        databaseId,
        collectionId,
        key,
        required: isRequired,
        min: schema.min,
        max: schema.max,
        array: false,
      });
      break;
    default:
      throw new Error(`Тип ${schema.type} не поддержан`);
  }
};

const createIndex = async (databaseId, collectionId, indexConfig) => {
  await databases.createIndex({
    databaseId,
    collectionId,
    key: indexConfig.key,
    type: indexConfig.type,
    attributes: indexConfig.attributes || [indexConfig.key],
    orders: indexConfig.orders || ["ASC"],
  });
};

const collectionExists = async (databaseId, collectionId) => {
  try {
    await databases.getCollection({ databaseId, collectionId });
    return true;
  } catch {
    return false;
  }
};

const migrate = async () => {
  const databaseId = appwriteConfig.databaseId;
  if (!databaseId) throw new Error("Нет NEXT_PUBLIC_APPWRITE_DATABASE_ID");

  console.log("Миграция vkr_topics — новые поля...");
  const topicsId = appwriteConfig.collections.vkr_topics;
  for (const [key, schema] of Object.entries(NEW_VKR_ATTRIBUTES)) {
    try {
      await createAttribute(databaseId, topicsId, key, schema);
      console.log(`  + vkr_topics.${key}`);
      await sleep(1000);
    } catch (e) {
      console.log(`  ~ vkr_topics.${key}: ${e.message}`);
    }
  }

  console.log("\nМиграция topic_audit_log...");
  const auditId = appwriteConfig.collections.topic_audit_log;
  const auditExists = await collectionExists(databaseId, auditId);

  if (!auditExists) {
    await databases.createCollection({
      databaseId,
      collectionId: auditId,
      name: "topic_audit_log",
      permissions: [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      documentSecurity: false,
    });
    console.log(`  Создана коллекция ${auditId}`);
    await sleep(1500);

    for (const [key, schema] of Object.entries(TOPIC_AUDIT_SCHEMA)) {
      try {
        await createAttribute(databaseId, auditId, key, schema);
        console.log(`    + ${key}`);
        await sleep(1000);
      } catch (e) {
        console.log(`    ~ ${key}: ${e.message}`);
      }
    }

    for (const indexConfig of TOPIC_AUDIT_INDEXES) {
      try {
        await createIndex(databaseId, auditId, indexConfig);
        console.log(`    + index ${indexConfig.key}`);
        await sleep(1000);
      } catch (e) {
        console.log(`    ~ index ${indexConfig.key}: ${e.message}`);
      }
    }
  } else {
    console.log(`  Коллекция ${auditId} уже есть — добавляем недостающие атрибуты`);
    for (const [key, schema] of Object.entries(TOPIC_AUDIT_SCHEMA)) {
      try {
        await createAttribute(databaseId, auditId, key, schema);
        console.log(`    + ${key}`);
        await sleep(1000);
      } catch (e) {
        console.log(`    ~ ${key}: ${e.message}`);
      }
    }
  }

  console.log("\nМиграция завершена.");
};

const main = async () => {
  const required = [
    "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
    "NEXT_PUBLIC_APPWRITE_DATABASE_ID",
    "APPWRITE_API_KEY",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("Нет переменных:", missing.join(", "));
    process.exit(1);
  }
  await migrate();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
