"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VkrTopicDoc } from "@/types";

const EMPTY_LABEL = "(не указано)";

function uniqueValues(
  topics: VkrTopicDoc[],
  field: "year" | "studentGroup" | "supervisorName"
): string[] {
  const set = new Set<string>();
  let hasEmpty = false;
  for (const t of topics) {
    const v = t[field]?.trim();
    if (v) set.add(v);
    else hasEmpty = true;
  }
  const list = [...set].sort((a, b) => a.localeCompare(b, "ru"));
  if (hasEmpty) list.push(EMPTY_LABEL);
  return list;
}

function matchesSet(
  value: string | undefined,
  selected: Set<string>
): boolean {
  if (selected.size === 0) return true;
  const key = value?.trim() || EMPTY_LABEL;
  return selected.has(key);
}

export type TopicsFilterState = {
  search: string;
  years: Set<string>;
  groups: Set<string>;
  supervisors: Set<string>;
};

export function filterTopics(
  topics: VkrTopicDoc[],
  filters: TopicsFilterState
): VkrTopicDoc[] {
  const q = filters.search.trim().toLowerCase();
  return topics.filter((t) => {
    if (q) {
      const inTitle = t.title.toLowerCase().includes(q);
      const inStudent = (t.studentName ?? "").toLowerCase().includes(q);
      if (!inTitle && !inStudent) return false;
    }
    if (!matchesSet(t.year, filters.years)) return false;
    if (!matchesSet(t.studentGroup, filters.groups)) return false;
    if (!matchesSet(t.supervisorName, filters.supervisors)) return false;
    return true;
  });
}

function FilterMultiDropdown({
  id,
  label,
  options,
  selected,
  openId,
  onOpen,
  onToggle,
  onClear,
}: {
  id: string;
  label: string;
  options: string[];
  selected: Set<string>;
  openId: string | null;
  onOpen: (id: string | null) => void;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isOpen = openId === id;

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onOpen(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpen(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onOpen]);

  const buttonLabel =
    selected.size === 0
      ? label
      : `${label}: ${selected.size}`;

  return (
    <div ref={rootRef} className="relative min-w-[10rem]">
      <button
        type="button"
        onClick={() => onOpen(isOpen ? null : id)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition ${
          isOpen || selected.size > 0
            ? "border-[#0d6efd] ring-2 ring-[#0d6efd]/20"
            : "border-slate-200/90 hover:border-slate-300"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate text-left font-medium">{buttonLabel}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-500 transition ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1.5 w-full min-w-[14rem] rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">Нет значений</p>
          ) : (
            <>
              {selected.size > 0 && (
                <div className="border-b border-slate-100 px-2 pb-2">
                  <button
                    type="button"
                    onClick={onClear}
                    className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-medium text-[#0d6efd] hover:bg-slate-50"
                  >
                    Сбросить выбор
                  </button>
                </div>
              )}
              <ul
                className="max-h-52 overflow-y-auto px-2"
                role="listbox"
                aria-label={label}
              >
                {options.map((opt) => (
                  <li key={opt}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-base text-slate-700 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#0d6efd] focus:ring-[#0d6efd]/30"
                        checked={selected.has(opt)}
                        onChange={() => onToggle(opt)}
                      />
                      <span className="leading-snug">{opt}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type TopicsFiltersProps = {
  topics: VkrTopicDoc[];
  filters: TopicsFilterState;
  onSearchChange: (value: string) => void;
  onToggleYear: (value: string) => void;
  onToggleGroup: (value: string) => void;
  onToggleSupervisor: (value: string) => void;
  onClearYears: () => void;
  onClearGroups: () => void;
  onClearSupervisors: () => void;
  onResetAll: () => void;
  filteredCount: number;
};

export function TopicsFilters({
  topics,
  filters,
  onSearchChange,
  onToggleYear,
  onToggleGroup,
  onToggleSupervisor,
  onClearYears,
  onClearGroups,
  onClearSupervisors,
  onResetAll,
  filteredCount,
}: TopicsFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const yearOptions = useMemo(() => uniqueValues(topics, "year"), [topics]);
  const groupOptions = useMemo(
    () => uniqueValues(topics, "studentGroup"),
    [topics]
  );
  const supervisorOptions = useMemo(
    () => uniqueValues(topics, "supervisorName"),
    [topics]
  );

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.years.size > 0 ||
    filters.groups.size > 0 ||
    filters.supervisors.size > 0;

  return (
    <div className="rounded-2xl border border-white/50 bg-white/90 p-4 shadow-xl backdrop-blur-md sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[12rem] flex-1">
            <label className="text-base font-semibold text-slate-800">
              Поиск по теме или фамилии студента
            </label>
            <input
              type="search"
              placeholder="Введите текст…"
              value={filters.search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAll}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Сбросить все фильтры
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-4">
          <FilterMultiDropdown
            id="group"
            label="Группа"
            options={groupOptions}
            selected={filters.groups}
            openId={openDropdown}
            onOpen={setOpenDropdown}
            onToggle={onToggleGroup}
            onClear={onClearGroups}
          />
          <FilterMultiDropdown
            id="supervisor"
            label="Руководитель"
            options={supervisorOptions}
            selected={filters.supervisors}
            openId={openDropdown}
            onOpen={setOpenDropdown}
            onToggle={onToggleSupervisor}
            onClear={onClearSupervisors}
          />
          <FilterMultiDropdown
            id="year"
            label="Год выпуска"
            options={yearOptions}
            selected={filters.years}
            openId={openDropdown}
            onOpen={setOpenDropdown}
            onToggle={onToggleYear}
            onClear={onClearYears}
          />
        </div>
      </div>

      <p className="mt-3 text-base text-slate-600">
        Показано:{" "}
        <span className="font-semibold text-slate-900">{filteredCount}</span> из{" "}
        {topics.length}
        {hasActiveFilters ? " (с учётом фильтров)" : ""}
      </p>
    </div>
  );
}

export function createEmptyFilters(): TopicsFilterState {
  return {
    search: "",
    years: new Set(),
    groups: new Set(),
    supervisors: new Set(),
  };
}

export function toggleSetValue(
  prev: Set<string>,
  value: string
): Set<string> {
  const next = new Set(prev);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
