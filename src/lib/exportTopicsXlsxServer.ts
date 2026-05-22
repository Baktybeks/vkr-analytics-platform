import * as XLSX from "xlsx";
import type { VkrTopicDoc } from "@/types";

export function buildTopicExportRows(
  topics: VkrTopicDoc[],
  deptName: (departmentId: string) => string
): Record<string, string | number>[] {
  return topics.map((t, index) => ({
    "№": index + 1,
    Кафедра: deptName(t.departmentId),
    "Название темы": t.title,
    Студент: t.studentName?.trim() || "",
    Группа: t.studentGroup?.trim() || "",
    "Год выпуска": t.year?.trim() || "",
    Руководитель: t.supervisorName?.trim() || "",
    Примечание: t.notes?.trim() || "",
    "Схожесть, %":
      t.similarityMaxPercent != null && t.similarityMaxPercent > 0
        ? t.similarityMaxPercent
        : "",
    "Дата создания": new Date(t.createdAt).toLocaleString("ru-RU"),
    "Дата изменения": new Date(t.updatedAt).toLocaleString("ru-RU"),
  }));
}

export function createTopicsWorkbookBuffer(
  topics: VkrTopicDoc[],
  deptName: (departmentId: string) => string
): Buffer {
  const rows = buildTopicExportRows(topics, deptName);
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 48 },
    { wch: 22 },
    { wch: 12 },
    { wch: 10 },
    { wch: 24 },
    { wch: 20 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Темы ВКР");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
