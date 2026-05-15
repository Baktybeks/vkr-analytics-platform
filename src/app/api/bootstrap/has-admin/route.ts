import { NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";

export async function GET() {
  const apiKey = process.env.APPWRITE_API_KEY;
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const profilesCollection =
    process.env.NEXT_PUBLIC_PROFILES_COLLECTION_ID || "profiles";

  if (!apiKey || !endpoint || !projectId || !databaseId) {
    return NextResponse.json(
      {
        error:
          "На сервере не заданы APPWRITE_API_KEY и/или публичные переменные Appwrite",
      },
      { status: 500 }
    );
  }

  try {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);
    const admins = await databases.listDocuments(
      databaseId,
      profilesCollection,
      [Query.equal("role", "ADMIN"), Query.limit(1)]
    );

    return NextResponse.json({ hasAdmin: admins.total > 0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Appwrite error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
