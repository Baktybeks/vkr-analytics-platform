import type { AuditChangeEntry } from "@/lib/topicAudit";

export const AUDIT_FIELD_LABELS: Record<string, string> = {
  title: "Название темы",
  studentName: "Студент",
  studentGroup: "Группа",
  supervisorName: "Руководитель",
  year: "Год выпуска",
  notes: "Примечание",
  departmentId: "Кафедра",
  similarityMaxPercent: "Макс. схожесть, %",
};

export function formatAuditChanges(changes?: string): string {
  if (!changes?.trim()) return "—";
  try {
    const parsed = JSON.parse(changes) as
      | AuditChangeEntry[]
      | { snapshot?: Record<string, unknown> };
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return "Сохранено без изменения полей";
      return parsed
        .map((c) => {
          const label = AUDIT_FIELD_LABELS[c.field] ?? c.field;
          return `${label}: ${c.from ?? "—"} → ${c.to ?? "—"}`;
        })
        .join("; ");
    }
    if (parsed.snapshot?.title) {
      return `Тема: «${String(parsed.snapshot.title)}»`;
    }
    return changes;
  } catch {
    return changes;
  }
}
