// scripts/testConnection.js
const { Client, Databases } = require("node-appwrite");
require("dotenv").config({ path: ".env.local" });

const testConnection = async () => {
  try {
    console.log("Тест подключения к Appwrite...\n");

    const client = new Client();
    client
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    console.log("Проверка подключения...");
    const databasesList = await databases.list();
    console.log("Подключение успешно.");
    console.log(`Найдено баз данных: ${databasesList.total}`);

    const targetDb = databasesList.databases.find(
      (db) => db.$id === process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
    );

    if (targetDb) {
      console.log(`База найдена: "${targetDb.name}" (${targetDb.$id})`);

      const collections = await databases.listCollections({
        databaseId: targetDb.$id,
      });
      console.log(`Коллекций в базе: ${collections.total}`);

      if (collections.total > 0) {
        console.log("\nСписок коллекций:");
        collections.collections.forEach((collection) => {
          console.log(`  - ${collection.name} (${collection.$id})`);
        });
      }
    } else {
      console.log("База данных не найдена.");
      console.log(
        "Проверьте NEXT_PUBLIC_APPWRITE_DATABASE_ID в .env.local"
      );
    }

    console.log("\nТест завершён.");
  } catch (error) {
    console.error("Ошибка подключения:", error.message);
    console.log("\nВозможные причины:");
    console.log("- Неверный API ключ");
    console.log("- Неверный Project ID");
    console.log("- Недостаточно прав у API ключа");
    console.log("- Сеть");

    console.log("\nПеременные окружения:");
    console.log(
      `  ENDPOINT: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "(пусто)"}`
    );
    console.log(
      `  PROJECT_ID: ${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "(пусто)"}`
    );
    console.log(
      `  DATABASE_ID: ${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "(пусто)"}`
    );
    console.log(
      `  API_KEY: ${process.env.APPWRITE_API_KEY ? "***" : "НЕ ЗАДАН"}`
    );
  }
};

testConnection();
