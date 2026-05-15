"use client";

import { useState } from "react";
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from "@/services/departmentsService";
import { toast } from "react-toastify";

export default function DepartmentsPage() {
  const { data: departments = [], isLoading } = useDepartments();
  const create = useCreateDepartment();
  const update = useUpdateDepartment();
  const del = useDeleteDepartment();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name, code },
      {
        onSuccess: () => {
          toast.success("Кафедра создана");
          setName("");
          setCode("");
        },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
          Кафедры
        </h1>
        <p className="mt-2 text-sm text-white/85">
          Справочник кафедр. У оператора при создании указывается одна из этих
          записей.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="rounded-2xl border border-white/50 bg-white/90 p-5 shadow-2xl shadow-slate-900/15 backdrop-blur-md"
      >
        <h2 className="font-medium text-slate-900">Новая кафедра</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            required
            placeholder="Название"
            className="min-w-[12rem] flex-1 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Код (необязательно)"
            className="w-40 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-full bg-[#0d6efd] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-[#0b5ed7] disabled:opacity-50"
          >
            Добавить
          </button>
        </div>
      </form>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Список</h2>
        {isLoading && (
          <p className="mt-2 text-sm text-slate-500">Загрузка…</p>
        )}
        <ul className="mt-3 divide-y divide-slate-200/80 rounded-2xl border border-white/50 bg-white/90 shadow-xl backdrop-blur-md">
          {departments.map((d) => (
            <li key={d.$id} className="px-4 py-3">
              {editingId === d.$id ? (
                <EditRow
                  initialName={d.name}
                  initialCode={d.code || ""}
                  onSave={(payload) => {
                    update.mutate(
                      { id: d.$id, ...payload },
                      {
                        onSuccess: () => {
                          toast.success("Сохранено");
                          setEditingId(null);
                        },
                        onError: (err: Error) => toast.error(err.message),
                      }
                    );
                  }}
                  onCancel={() => setEditingId(null)}
                  pending={update.isPending}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{d.name}</p>
                    {d.code && (
                      <p className="text-xs text-slate-500">Код: {d.code}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#0d6efd] hover:underline"
                      onClick={() => setEditingId(d.$id)}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => {
                        if (confirm("Удалить кафедру?")) {
                          del.mutate(d.$id, {
                            onSuccess: () => toast.success("Удалено"),
                            onError: (err: Error) => toast.error(err.message),
                          });
                        }
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function EditRow({
  initialName,
  initialCode,
  onSave,
  onCancel,
  pending,
}: {
  initialName: string;
  initialCode: string;
  onSave: (p: { name: string; code?: string }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState(initialCode);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <input
        className="min-w-[10rem] flex-1 rounded-lg border border-slate-200/90 bg-white/95 px-2 py-1.5 text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-1 focus:ring-[#0d6efd]/30"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-32 rounded-lg border border-slate-200/90 bg-white/95 px-2 py-1.5 text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-1 focus:ring-[#0d6efd]/30"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button
        type="button"
        disabled={pending || !name.trim()}
        className="rounded-full bg-[#0d6efd] px-3 py-1.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#0b5ed7] disabled:opacity-50"
        onClick={() => onSave({ name, code })}
      >
        Сохранить
      </button>
      <button
        type="button"
        className="rounded-full border border-slate-300 bg-white/90 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-white"
        onClick={onCancel}
      >
        Отмена
      </button>
    </div>
  );
}
