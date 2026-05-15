import { NextResponse } from "next/server";
import { Databases } from "node-appwrite";
import { appwriteConfig, getCollectionId } from "@/constants/appwriteConfig";
import { createAdminClient, getSessionProfile } from "@/lib/serverAppwrite";

/** Список кафедр: админ — все; оператор — только своя (без доступа к чужим). */
export async function GET() {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const dbId = appwriteConfig.databaseId;
    if (!dbId) {
      return NextResponse.json({ error: "База не настроена" }, { status: 500 });
    }

    const adminClient = createAdminClient();
    const databases = new Databases(adminClient);
    const coll = getCollectionId("departments");

    if (session.profile.role === "ADMIN") {
      const res = await databases.listDocuments(dbId, coll);
      return NextResponse.json(res);
    }

    if (session.profile.role === "OPERATOR") {
      const deptId = session.profile.departmentId?.trim();
      if (!deptId) {
        return NextResponse.json(
          { documents: [], total: 0 },
          { status: 200 }
        );
      }
      try {
        const doc = await databases.getDocument(dbId, coll, deptId);
        return NextResponse.json({ documents: [doc], total: 1 });
      } catch {
        return NextResponse.json({ documents: [], total: 0 });
      }
    }

    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
