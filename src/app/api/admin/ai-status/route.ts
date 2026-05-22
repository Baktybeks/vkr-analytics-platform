import { NextResponse } from "next/server";
import {
  OPENAI_SETUP_HINT,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/openaiClient";
import { getSessionProfile } from "@/lib/serverAppwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Только ADMIN: видно, подхватился ли OPENAI_API_KEY на сервере (без вывода ключа). */
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

    const configured = isOpenAIConfigured();
    return NextResponse.json({
      configured,
      model: getOpenAIModel(),
      hint: configured ? null : OPENAI_SETUP_HINT,
      vercelNote: configured
        ? null
        : "На Vercel после добавления переменной нужен Redeploy (Deployments → … → Redeploy).",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
