import { NextResponse } from "next/server";
import { exportAppwriteBackup } from "@/lib/backupAppwrite";
import { getSessionProfile } from "@/lib/serverAppwrite";

export async function GET() {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    if (session.profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Только для администратора" }, {
        status: 403,
      });
    }

    const backup = await exportAppwriteBackup();
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const filename = `vkr-backup-${stamp}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка резервного копирования";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
