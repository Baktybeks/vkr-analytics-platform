import { NextResponse } from "next/server";
import { ID, Query, Databases } from "node-appwrite";
import { appwriteConfig, getCollectionId } from "@/constants/appwriteConfig";
import {
  createAdminClient,
  getSessionProfile,
  getUsersService,
} from "@/lib/serverAppwrite";

type Body = {
  email: string;
  password: string;
  fullName: string;
  departmentId: string;
};

export async function POST(request: Request) {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    if (session.profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const body = (await request.json()) as Partial<Body>;
    const email = body.email?.trim();
    const password = body.password;
    const fullName = body.fullName?.trim();
    const departmentId = body.departmentId?.trim();

    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Укажите email и пароль (не менее 8 символов)" },
        { status: 400 }
      );
    }
    if (!fullName) {
      return NextResponse.json({ error: "Укажите ФИО" }, { status: 400 });
    }
    if (!departmentId) {
      return NextResponse.json(
        { error: "Выберите кафедру" },
        { status: 400 }
      );
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

    const users = getUsersService();
    const userId = ID.unique();

    await users.create({
      userId,
      email,
      password,
      name: fullName,
    });

    await databases.createDocument(
      dbId,
      getCollectionId("profiles"),
      userId,
      {
        userId,
        fullName,
        role: "OPERATOR",
        departmentId,
        createdAt: new Date().toISOString(),
      }
    );

    return NextResponse.json({ ok: true, userId });
  } catch (e) {
    const err = e as { message?: string; code?: number };
    const msg = err.message || "Ошибка создания пользователя";
    const status = err.code === 409 ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET() {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    if (session.profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const dbId = appwriteConfig.databaseId;
    if (!dbId) {
      return NextResponse.json({ error: "База не настроена" }, { status: 500 });
    }

    const adminClient = createAdminClient();
    const databases = new Databases(adminClient);
    const res = await databases.listDocuments(
      dbId,
      getCollectionId("profiles"),
      [Query.equal("role", "OPERATOR"), Query.limit(200)]
    );

    return NextResponse.json(res);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
