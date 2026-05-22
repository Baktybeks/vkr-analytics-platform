import { NextResponse } from "next/server";
import { createTopicsWorkbookBuffer } from "@/lib/exportTopicsXlsxServer";
import { getSessionProfile } from "@/lib/serverAppwrite";
import type { DepartmentDoc, VkrTopicDoc } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = (await request.json()) as {
      topics?: VkrTopicDoc[];
      departments?: Pick<DepartmentDoc, "$id" | "name">[];
    };

    const topics = body.topics ?? [];
    if (topics.length === 0) {
      return NextResponse.json(
        { error: "Нет тем для экспорта" },
        { status: 400 }
      );
    }

    if (session.profile.role === "OPERATOR") {
      const mine = session.profile.departmentId?.trim();
      if (!mine) {
        return NextResponse.json(
          { error: "У оператора не задана кафедра" },
          { status: 403 }
        );
      }
      const foreign = topics.some((t) => t.departmentId !== mine);
      if (foreign) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
      }
    }

    const deptMap = new Map(
      (body.departments ?? []).map((d) => [d.$id, d.name])
    );
    const deptName = (id: string) => deptMap.get(id) || id;

    const buffer = createTopicsWorkbookBuffer(topics, deptName);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `vkr-topics-${stamp}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка экспорта";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
