"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { useCurrentUser } from "@/services/authService";
import { useDepartments } from "@/services/departmentsService";
import { appwriteApiFetch } from "@/lib/appwriteApiFetch";
import { normalizeTopicTitle } from "@/lib/normalizeTopicTitle";
import { TopicHistoryPanel } from "@/components/topics/TopicHistoryPanel";
import {
  SimilarityMatchCard,
  TopicSimilarityBadge,
  TopicSimilarityPanel,
} from "@/components/topics/TopicSimilarityPanel";
import {
  TopicsFilters,
  createEmptyFilters,
  filterTopics,
  toggleSetValue,
  type TopicsFilterState,
} from "@/components/topics/TopicsFilters";
import type { TopicSimilarityMatch, VkrTopicDoc } from "@/types";
import { toast } from "react-toastify";

type TopicList = { documents: VkrTopicDoc[]; total: number };

async function fetchTopics(url: string): Promise<TopicList> {
  const res = await appwriteApiFetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Ошибка загрузки тем");
  }
  return res.json();
}

export default function TopicsPage() {
  const qc = useQueryClient();
  const storeUser = useAuthStore((s) => s.user);
  const { data: sessionUser } = useCurrentUser();
  const user = storeUser ?? sessionUser;

  const { data: departments = [] } = useDepartments();
  const deptName = useMemo(() => {
    const map = new Map(departments.map((d) => [d.$id, d.name]));
    return (id: string) => map.get(id) || id;
  }, [departments]);

  const [adminDeptFilter, setAdminDeptFilter] = useState<string>("");
  const topicsUrl =
    user?.role === "ADMIN" && adminDeptFilter
      ? `/api/topics?departmentId=${encodeURIComponent(adminDeptFilter)}`
      : "/api/topics";

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "topics",
      topicsUrl,
      user?.$id,
      user?.role,
      user?.departmentId ?? "",
    ],
    queryFn: () => fetchTopics(topicsUrl),
    enabled: !!user,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentGroup, setStudentGroup] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [year, setYear] = useState("");
  const [notes, setNotes] = useState("");
  const [adminDeptCreate, setAdminDeptCreate] = useState("");

  const [editing, setEditing] = useState<VkrTopicDoc | null>(null);
  const [historyTopicId, setHistoryTopicId] = useState<string | null>(null);
  const [similarTopicId, setSimilarTopicId] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiMatches, setAiMatches] = useState<TopicSimilarityMatch[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const [listFilters, setListFilters] = useState<TopicsFilterState>(
    createEmptyFilters
  );

  const topics = useMemo(
    () => (data?.documents ?? []) as VkrTopicDoc[],
    [data]
  );

  const filteredTopics = useMemo(
    () => filterTopics(topics, listFilters),
    [topics, listFilters]
  );

  useEffect(() => {
    setListFilters(createEmptyFilters());
  }, [topicsUrl]);

  const effectiveDeptId =
    user?.role === "ADMIN"
      ? adminDeptCreate
      : user?.departmentId ?? "";

  const duplicateHint = useMemo(() => {
    const n = normalizeTopicTitle(title);
    if (!n) return null;
    let scope = topics;
    if (user?.role === "ADMIN" && adminDeptCreate) {
      scope = topics.filter((t) => t.departmentId === adminDeptCreate);
    } else if (user?.role === "OPERATOR" && user.departmentId) {
      scope = topics.filter((t) => t.departmentId === user.departmentId);
    }
    const same = scope.filter(
      (t) =>
        normalizeTopicTitle(t.title) === n && (!editing || t.$id !== editing.$id)
    );
    if (same.length === 0) return null;
    return `Внимание: уже есть ${same.length} тем(а) с такой же нормализованной формулировкой на этой кафедре.`;
  }, [title, topics, user, adminDeptCreate, editing]);

  const resetAi = useCallback(() => {
    setAiMatches([]);
    setAiSummary(null);
  }, []);

  const resetForm = useCallback(() => {
    setEditing(null);
    setTitle("");
    setStudentName("");
    setStudentGroup("");
    setSupervisorName("");
    setYear("");
    setNotes("");
    setAdminDeptCreate("");
    resetAi();
  }, [resetAi]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    resetForm();
  }, [resetForm]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  const openCreateModal = () => {
    resetForm();
    if (user?.role === "ADMIN" && adminDeptFilter) {
      setAdminDeptCreate(adminDeptFilter);
    }
    setModalOpen(true);
  };

  const openEditModal = (t: VkrTopicDoc) => {
    setEditing(t);
    setTitle(t.title);
    setStudentName(t.studentName || "");
    setStudentGroup(t.studentGroup || "");
    setSupervisorName(t.supervisorName || "");
    setYear(t.year || "");
    setNotes(t.notes || "");
    setAdminDeptCreate(user?.role === "ADMIN" ? t.departmentId : "");
    resetAi();
    setModalOpen(true);
  };

  const runAiCheck = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.info("Сначала введите название темы");
      return;
    }
    if (user?.role === "ADMIN" && !effectiveDeptId) {
      toast.info("Выберите кафедру");
      return;
    }
    setAiLoading(true);
    resetAi();
    try {
      const body: Record<string, string> = { title: trimmed };
      if (user?.role === "ADMIN" && effectiveDeptId) {
        body.departmentId = effectiveDeptId;
      }
      if (editing?.$id) body.excludeTopicId = editing.$id;

      const res = await appwriteApiFetch("/api/topics/similarity-check", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        error?: string;
        matches?: TopicSimilarityMatch[];
        summaryMessage?: string;
      };
      if (!res.ok) throw new Error(data.error || "Ошибка проверки");
      setAiMatches(data.matches ?? []);
      setAiSummary(data.summaryMessage ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка ИИ");
    } finally {
      setAiLoading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        studentName: studentName.trim() || undefined,
        studentGroup: studentGroup.trim() || undefined,
        supervisorName: supervisorName.trim() || undefined,
        year: year.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (user?.role === "ADMIN") {
        if (!adminDeptCreate) throw new Error("Выберите кафедру");
        payload.departmentId = adminDeptCreate;
      }
      if (aiMatches.length > 0) {
        payload.similarityMatches = aiMatches;
      }
      const res = await appwriteApiFetch("/api/topics", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error || "Ошибка сохранения");
      }
      return res.json();
    },
    onSuccess: (doc: VkrTopicDoc) => {
      const pct = doc?.similarityMaxPercent;
      if (pct && pct > 0) {
        toast.success(`Тема добавлена. Макс. схожесть с другими: ${pct}%`);
      } else {
        toast.success("Тема добавлена");
      }
      closeModal();
      qc.invalidateQueries({ queryKey: ["topics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const res = await appwriteApiFetch(`/api/topics/${editing.$id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          studentName: studentName.trim(),
          studentGroup: studentGroup.trim(),
          supervisorName: supervisorName.trim(),
          year: year.trim(),
          notes: notes.trim(),
          ...(user?.role === "ADMIN" && adminDeptCreate
            ? { departmentId: adminDeptCreate }
            : {}),
          ...(aiMatches.length > 0 ? { similarityMatches: aiMatches } : {}),
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error || "Ошибка обновления");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Тема обновлена");
      closeModal();
      qc.invalidateQueries({ queryKey: ["topics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await appwriteApiFetch(`/api/topics/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error || "Ошибка удаления");
      }
    },
    onSuccess: () => {
      toast.success("Удалено");
      qc.invalidateQueries({ queryKey: ["topics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) return null;

  const isEdit = !!editing;
  const modalTitle = isEdit ? "Редактирование темы" : "Новая тема";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-sm">
            Темы ВКР
          </h1>
          <p className="mt-2 text-base text-white/85">
            {user.role === "OPERATOR" && user.departmentId
              ? `Кафедра: ${deptName(user.departmentId)}`
              : "Администратор: при необходимости отфильтруйте список по кафедре."}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="shrink-0 rounded-full bg-[#0d6efd] px-6 py-2.5 text-base font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-[#0b5ed7]"
        >
          + Добавить тему
        </button>
      </div>

      {user.role === "ADMIN" && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/35 bg-white/10 px-4 py-3 backdrop-blur-md">
          <div>
            <label className="text-base font-medium text-white/90">
              Фильтр по кафедре
            </label>
            <select
              className="mt-1 block rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
              value={adminDeptFilter}
              onChange={(e) => setAdminDeptFilter(e.target.value)}
            >
              <option value="">Все кафедры</option>
              {departments.map((d) => (
                <option key={d.$id} value={d.$id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!isLoading && topics.length > 0 && (
        <TopicsFilters
          topics={topics}
          filters={listFilters}
          filteredCount={filteredTopics.length}
          onSearchChange={(search) =>
            setListFilters((f) => ({ ...f, search }))
          }
          onToggleYear={(value) =>
            setListFilters((f) => ({
              ...f,
              years: toggleSetValue(f.years, value),
            }))
          }
          onToggleGroup={(value) =>
            setListFilters((f) => ({
              ...f,
              groups: toggleSetValue(f.groups, value),
            }))
          }
          onToggleSupervisor={(value) =>
            setListFilters((f) => ({
              ...f,
              supervisors: toggleSetValue(f.supervisors, value),
            }))
          }
          onClearYears={() =>
            setListFilters((f) => ({ ...f, years: new Set() }))
          }
          onClearGroups={() =>
            setListFilters((f) => ({ ...f, groups: new Set() }))
          }
          onClearSupervisors={() =>
            setListFilters((f) => ({ ...f, supervisors: new Set() }))
          }
          onResetAll={() => setListFilters(createEmptyFilters())}
        />
      )}

      <section>
        <h2 className="text-xl font-semibold text-white drop-shadow-sm">
          Список тем
        </h2>
        {isLoading && (
          <p className="mt-2 text-base text-white/70">Загрузка…</p>
        )}
        {error && (
          <p className="mt-2 text-base text-red-200">
            {(error as Error).message}
          </p>
        )}
        {!isLoading && topics.length === 0 && (
          <p className="mt-2 text-base text-white/70">Пока нет тем.</p>
        )}
        {!isLoading && topics.length > 0 && filteredTopics.length === 0 && (
          <p className="mt-2 text-base text-white/70">
            По заданным фильтрам тем не найдено. Измените условия или сбросьте
            фильтры.
          </p>
        )}
        <ul className="mt-3 divide-y divide-slate-200/80 rounded-2xl border border-white/50 bg-white/90 shadow-xl backdrop-blur-md">
          {filteredTopics.map((t) => (
            <li key={t.$id} className="px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-medium text-slate-900">{t.title}</p>
                    <TopicSimilarityBadge topic={t} />
                  </div>
                  <p className="text-base text-slate-500">
                    {deptName(t.departmentId)} ·{" "}
                    {new Date(t.createdAt).toLocaleDateString("ru-RU")}
                    {t.year ? ` · выпуск ${t.year}` : ""}
                    {t.studentGroup ? ` · гр. ${t.studentGroup}` : ""}
                  </p>
                  {(t.studentName || t.supervisorName) && (
                    <p className="mt-1 text-base text-slate-600">
                      {[t.studentName, t.supervisorName]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-base font-semibold text-[#0d6efd] hover:underline"
                    onClick={() => openEditModal(t)}
                  >
                    Изменить
                  </button>
                  {(t.similarityMaxPercent ?? 0) > 0 && (
                    <button
                      type="button"
                      className="text-base font-semibold text-violet-700 hover:underline"
                      onClick={() => {
                        setSimilarTopicId((id) =>
                          id === t.$id ? null : t.$id
                        );
                        if (historyTopicId === t.$id) setHistoryTopicId(null);
                      }}
                    >
                      {similarTopicId === t.$id
                        ? "Скрыть похожие"
                        : "С кем похожа"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-base font-semibold text-slate-600 hover:underline"
                    onClick={() => {
                      setHistoryTopicId((id) => (id === t.$id ? null : t.$id));
                      if (similarTopicId === t.$id) setSimilarTopicId(null);
                    }}
                  >
                    {historyTopicId === t.$id ? "Скрыть историю" : "История"}
                  </button>
                  <button
                    type="button"
                    className="text-base text-red-600 hover:underline"
                    onClick={() => {
                      if (confirm("Удалить тему?")) deleteMutation.mutate(t.$id);
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
              {similarTopicId === t.$id && (
                <div className="mt-3 rounded-xl border border-violet-200/80 bg-violet-50/50 p-3">
                  <h3 className="text-base font-semibold text-violet-900">
                    Похожие темы на кафедре
                    {t.similarityMaxPercent != null &&
                      ` (макс. ${t.similarityMaxPercent}%)`}
                  </h3>
                  <TopicSimilarityPanel topic={t} allTopics={topics} />
                </div>
              )}
              {historyTopicId === t.$id && (
                <TopicHistoryPanel topicId={t.$id} />
              )}
            </li>
          ))}
        </ul>
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="topic-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/65 backdrop-blur-sm"
            aria-label="Закрыть"
            onClick={closeModal}
          />
          <div
            className="relative z-[101] max-h-[min(90vh,800px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/50 bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-4">
              <h2
                id="topic-modal-title"
                className="text-2xl font-bold text-slate-900"
              >
                {modalTitle}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Закрыть окно"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {duplicateHint && (
              <p className="mt-4 text-base text-amber-700">{duplicateHint}</p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-base font-medium text-slate-700">
                  Название темы
                </label>
                <textarea
                  required
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    resetAi();
                  }}
                />
                <button
                  type="button"
                  disabled={aiLoading || !title.trim()}
                  onClick={runAiCheck}
                  className="mt-2 rounded-full border border-[#0d6efd] bg-[#0d6efd]/10 px-4 py-2 text-base font-semibold text-[#0d6efd] transition hover:bg-[#0d6efd]/20 disabled:opacity-50"
                >
                  {aiLoading ? "Проверка ИИ…" : "Проверить похожие темы (ИИ)"}
                </button>
              </div>

              {aiSummary && (
                <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-base font-medium text-slate-800">
                    {aiSummary}
                  </p>
                  {aiMatches.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {aiMatches.map((m) => (
                        <SimilarityMatchCard key={m.topicId} match={m} />
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {user.role === "ADMIN" && !isEdit && (
                <div className="sm:col-span-2">
                  <label className="text-base font-medium text-slate-700">
                    Кафедра
                  </label>
                  <select
                    required
                    className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
                    value={adminDeptCreate}
                    onChange={(e) => {
                      setAdminDeptCreate(e.target.value);
                      resetAi();
                    }}
                  >
                    <option value="">Выберите кафедру</option>
                    {departments.map((d) => (
                      <option key={d.$id} value={d.$id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {user.role === "ADMIN" && isEdit && (
                <div className="sm:col-span-2">
                  <label className="text-base font-medium text-slate-700">
                    Кафедра
                  </label>
                  <select
                    className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
                    value={adminDeptCreate}
                    onChange={(e) => setAdminDeptCreate(e.target.value)}
                  >
                    {departments.map((d) => (
                      <option key={d.$id} value={d.$id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-base font-medium text-slate-700">
                  Студент
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-base font-medium text-slate-700">
                  Группа
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
                  value={studentGroup}
                  onChange={(e) => setStudentGroup(e.target.value)}
                  placeholder="Напр. ИВТ-401"
                />
              </div>
              <div>
                <label className="text-base font-medium text-slate-700">
                  Руководитель
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-base font-medium text-slate-700">
                  Год выпуска
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2026"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-base font-medium text-slate-700">
                  Примечание
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {isEdit && editing && (
              <div className="mt-4 border-t border-slate-200/80 pt-4">
                <h3 className="text-base font-semibold text-slate-800">
                  История изменений
                </h3>
                <TopicHistoryPanel topicId={editing.$id} />
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200/80 pt-4">
              <button
                type="button"
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-base font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={closeModal}
              >
                Отмена
              </button>
              {isEdit ? (
                <button
                  type="button"
                  disabled={updateMutation.isPending || !title.trim()}
                  className="rounded-full bg-[#0d6efd] px-5 py-2 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-[#0b5ed7] disabled:opacity-50"
                  onClick={() => updateMutation.mutate()}
                >
                  {updateMutation.isPending ? "Сохранение…" : "Сохранить"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={
                    createMutation.isPending ||
                    !title.trim() ||
                    (user.role === "ADMIN" && !adminDeptCreate)
                  }
                  className="rounded-full bg-[#0d6efd] px-5 py-2 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-[#0b5ed7] disabled:opacity-50"
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? "Добавление…" : "Добавить тему"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
