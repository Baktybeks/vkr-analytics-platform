import { appwriteApiFetch } from "@/lib/appwriteApiFetch";
import type { DepartmentDoc, VkrTopicDoc } from "@/types";

/** Скачивание Excel через сервер (без xlsx в браузере). */
export async function downloadTopicsXlsx(
  topics: VkrTopicDoc[],
  departments: DepartmentDoc[],
  filename?: string
): Promise<void> {
  const res = await appwriteApiFetch("/api/topics/export", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topics,
      departments: departments.map((d) => ({ $id: d.$id, name: d.name })),
    }),
  });

  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error || "Ошибка экспорта");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ??
    res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
    `vkr-topics-${Date.now()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
