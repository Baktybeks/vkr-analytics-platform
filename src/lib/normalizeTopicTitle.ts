/** Нормализация заголовка темы ВКР для сравнения дубликатов внутри кафедры. */
export function normalizeTopicTitle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/[.,;:!?'"«»()\-–—/\\]+/g, "")
    .trim();
}
