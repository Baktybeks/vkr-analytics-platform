import { Client, Databases, Account } from "appwrite";
import { appwriteConfig } from "@/constants/appwriteConfig";

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

export const databases = new Databases(client);
export const account = new Account(client);
export { client };

export const appwriteHelpers = {
  handleAppwriteError: (error: unknown) => {
    const err = error as { code?: number; message?: string };
    if (err.code === 401) return new Error("Не авторизован");
    if (err.code === 403) return new Error("Нет доступа");
    if (err.code === 404) return new Error("Не найдено");
    if (err.code === 409) return new Error("Конфликт данных");
    if (err.message) return new Error(err.message);
    return new Error("Ошибка Appwrite");
  },
};
