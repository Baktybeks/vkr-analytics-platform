// scripts/setupCollections.js — ВКР: кафедры, профили, темы
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
  },
};

const COLLECTION_SCHEMAS = {
  departments: {
    name: { type: "string", required: true, size: 255 },
    code: { type: "string", required: false, size: 64 },
    createdAt: { type: "datetime", required: true },
  },

  profiles: {
    userId: { type: "string", required: true, size: 36 },
    fullName: { type: "string", required: true, size: 255 },
    role: {
      type: "enum",
      required: true,
      elements: ["ADMIN", "OPERATOR"],
    },
    departmentId: { type: "string", required: false, size: 36 },
    createdAt: { type: "datetime", required: true },
  },

  vkr_topics: {
    title: { type: "string", required: true, size: 512 },
    normalizedTitle: { type: "string", required: true, size: 512 },
    departmentId: { type: "string", required: true, size: 36 },
    createdByUserId: { type: "string", required: true, size: 36 },
    studentName: { type: "string", required: false, size: 255 },
    supervisorName: { type: "string", required: false, size: 255 },
    year: { type: "string", required: false, size: 16 },
    notes: { type: "string", required: false, size: 2000 },
    createdAt: { type: "datetime", required: true },
    updatedAt: { type: "datetime", required: true },
  },
};

const COLLECTION_INDEXES = {
  departments: [{ key: "name", type: "key" }],
  profiles: [
    { key: "userId", type: "unique" },
    { key: "role", type: "key" },
    { key: "departmentId", type: "key" },
  ],
  vkr_topics: [
    { key: "departmentId", type: "key" },
    { key: "normalizedTitle", type: "key" },
    {
      key: "departmentId_normalizedTitle",
      type: "unique",
      attributes: ["departmentId", "normalizedTitle"],
    },
  ],
};

const client = new Client();
client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const createAttribute = async (databaseId, collectionId, key, schema) => {
  try {
    const attributeType = schema.type;
    let isRequired = schema.required || false;
    let defaultValue = schema.default;

    if (isRequired && defaultValue !== null && defaultValue !== undefined) {
      console.log(
        `    Правка ${key}: required=true с default -> required=false`
      );
      isRequired = false;
    }

    switch (attributeType) {
      case "string":
        return await databases.createStringAttribute({
          databaseId,
          collectionId,
          key,
          size: schema.size || 255,
          required: isRequired,
          default: defaultValue ?? undefined,
          array: schema.array || false,
        });

      case "enum":
        return await databases.createEnumAttribute({
          databaseId,
          collectionId,
          key,
          elements: schema.elements,
          required: isRequired,
          default: defaultValue ?? undefined,
          array: schema.array || false,
        });

      case "datetime":
        return await databases.createDatetimeAttribute({
          databaseId,
          collectionId,
          key,
          required: isRequired,
          default: defaultValue ?? undefined,
          array: schema.array || false,
        });

      default:
        throw new Error(`Неподдерживаемый тип: ${attributeType}`);
    }
  } catch (error) {
    console.error(`Ошибка атрибута ${key}:`, error.message);
    throw error;
  }
};

const createIndex = async (databaseId, collectionId, indexConfig) => {
  try {
    return await databases.createIndex({
      databaseId,
      collectionId,
      key: indexConfig.key,
      type: indexConfig.type,
      attributes: indexConfig.attributes || [indexConfig.key],
      orders: indexConfig.orders || ["ASC"],
    });
  } catch (error) {
    console.error(`Ошибка индекса ${indexConfig.key}:`, error.message);
    throw error;
  }
};

const setupCollections = async () => {
  try {
    console.log("Создание коллекций...");
    const databaseId = appwriteConfig.databaseId;
    if (!databaseId) {
      throw new Error("Нет NEXT_PUBLIC_APPWRITE_DATABASE_ID");
    }

    for (const [collectionName, schema] of Object.entries(
      COLLECTION_SCHEMAS
    )) {
      console.log(`\nКоллекция: ${collectionName}`);
      try {
        const collectionId = appwriteConfig.collections[collectionName];

        await databases.createCollection({
          databaseId,
          collectionId,
          name: collectionName,
          permissions: [
            Permission.read(Role.users()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
          ],
          documentSecurity: false,
        });

        console.log(`  Создана: ${collectionId}`);

        for (const [attributeKey, attributeSchema] of Object.entries(schema)) {
          try {
            await createAttribute(
              databaseId,
              collectionId,
              attributeKey,
              attributeSchema
            );
            console.log(`    + ${attributeKey}`);
            await new Promise((r) => setTimeout(r, 1000));
          } catch (error) {
            console.error(`    - ${attributeKey}: ${error.message}`);
          }
        }

        if (COLLECTION_INDEXES[collectionName]) {
          console.log("  Индексы...");
          for (const indexConfig of COLLECTION_INDEXES[collectionName]) {
            try {
              await createIndex(databaseId, collectionId, indexConfig);
              console.log(`    + ${indexConfig.key}`);
              await new Promise((r) => setTimeout(r, 1000));
            } catch (error) {
              console.error(`    - ${indexConfig.key}: ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.error(`Ошибка коллекции ${collectionName}:`, error.message);
      }
    }

    console.log("\nГотово. Проверьте консоль Appwrite.");
  } catch (error) {
    console.error("Общая ошибка:", error.message);
  }
};

const resetCollections = async () => {
  console.log("Удаление коллекций...");
  const databaseId = appwriteConfig.databaseId;
  for (const collectionName of Object.keys(COLLECTION_SCHEMAS)) {
    try {
      const collectionId = appwriteConfig.collections[collectionName];
      await databases.deleteCollection({ databaseId, collectionId });
      console.log(`Удалена: ${collectionName}`);
    } catch (error) {
      console.log(`Пропуск ${collectionName}: ${error.message}`);
    }
  }
};

const checkEnvironment = () => {
  const required = [
    "NEXT_PUBLIC_APPWRITE_ENDPOINT",
    "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
    "NEXT_PUBLIC_APPWRITE_DATABASE_ID",
    "APPWRITE_API_KEY",
  ];
  const missing = required.filter((env) => !process.env[env]);
  if (missing.length > 0) {
    console.error("Нет переменных:", missing.join(", "));
    process.exit(1);
  }
  console.log("Переменные окружения найдены.");
};

const main = async () => {
  console.log("ВКР — настройка БД Appwrite\n");
  checkEnvironment();
  const command = process.argv[2];
  switch (command) {
    case "setup":
      await setupCollections();
      break;
    case "reset":
      await resetCollections();
      break;
    case "reset-setup":
      await resetCollections();
      console.log("\nПауза 3 с...");
      await new Promise((r) => setTimeout(r, 3000));
      await setupCollections();
      break;
    default:
      console.log("Использование:");
      console.log("  node scripts/setupCollections.js setup");
      console.log("  node scripts/setupCollections.js reset");
      console.log("  node scripts/setupCollections.js reset-setup");
  }
};

if (require.main === module) {
  main().catch(console.error);
}
