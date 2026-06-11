"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import type { OperatorTask } from "@/types";
import { AlertCircle, CheckCircle2, Clock, Eye, Plus, X } from "lucide-react";
import clsx from "clsx";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: "Chờ xử lý", color: "bg-amber-50 text-amber-700", icon: <Clock size={12} /> },
  IN_PROGRESS: { label: "Đang xử lý", color: "bg-blue-50 text-blue-700", icon: <AlertCircle size={12} /> },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-50 text-green-700", icon: <CheckCircle2 size={12} /> },
  CANCELLED: { label: "Đã hủy", color: "bg-slate-100 text-slate-500", icon: null },
};

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<OperatorTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<OperatorTask | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "update">("view");
  const [form, setForm] = useState({ title: "", description: "", dueDate: "" });
  const [updateForm, setUpdateForm] = useState({ status: "IN_PROGRESS", reportNotes: "", reportResult: "" });
  const [submitting, setSubmitting] = useState(false);
  const isProvince = user?.role === "OPERATOR_PROVINCE";

  function load() {
    api.get("/operator/tasks").then((r) => setTasks(r.data.data ?? [])).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/operator/tasks", form);
      setShowForm(false);
      setForm({ title: "", description: "", dueDate: "" });
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmitting(true);
    try {
      await api.patch(`/operator/tasks/${selectedTask.id}`, updateForm);
      setSelectedTask(null);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  function openTask(task: OperatorTask, mode: "view" | "update") {
    setSelectedTask(task);
    setModalMode(mode);
    setUpdateForm({
      status: task.status === "COMPLETED" || task.status === "CANCELLED" ? task.status : "IN_PROGRESS",
      reportNotes: task.reportNotes ?? "",
      reportResult: task.reportResult ?? "",
    });
  }

  const activeTasks = tasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((t) => t.status === "COMPLETED" || t.status === "CANCELLED");
  const canUpdateTask = (task: OperatorTask) => task.assignee?.id === user?.id || task.assignee?.email === user?.email;

  return (
    <PortalShell title={isProvince ? "Quản lý Nhiệm vụ" : "Nhiệm vụ của tôi"}>
      <div className="space-y-6">
        {isProvince && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus size={16} /> Giao nhiệm vụ
            </button>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Giao nhiệm vụ</h3>
                <button onClick={() => setShowForm(false)}>
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Tiêu đề *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Mô tả</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Người nhận</label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    Tự động giao cho bạn
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Hạn chót</label>
                  <input
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-slate-300 py-2 text-sm text-slate-700">
                    Hủy
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {submitting ? "Đang giao..." : "Giao nhiệm vụ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-600">Đang xử lý ({activeTasks.length})</h2>
              {activeTasks.length === 0 && <p className="text-sm text-slate-400">Không có nhiệm vụ nào đang chạy.</p>}
              <div className="grid gap-3">
                {activeTasks.map((t) => {
                  const cfg = STATUS_CONFIG[t.status];
                  return (
                    <div key={t.id} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{t.title}</p>
                          {t.description && <p className="mt-0.5 text-sm text-slate-500">{t.description}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span className={clsx("flex items-center gap-1 rounded px-2 py-0.5 text-xs", cfg.color)}>
                              {cfg.icon}
                              {cfg.label}
                            </span>
                            {t.dueDate && <span className="text-xs text-slate-400">Hạn: {new Date(t.dueDate).toLocaleDateString("vi-VN")}</span>}
                            {t.assignee && <span className="text-xs text-slate-400">→ {t.assignee.email}</span>}
                            {t.assigner && <span className="text-xs text-slate-400">Từ: {t.assigner.email}</span>}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <button
                            onClick={() => openTask(t, "view")}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Eye size={12} />
                            Xem
                          </button>
                          {canUpdateTask(t) && (
                            <button
                              onClick={() => openTask(t, "update")}
                              className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                            >
                              Cập nhật tiến độ
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {doneTasks.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold text-slate-600">Đã hoàn thành ({doneTasks.length})</h2>
                <div className="grid gap-2">
                  {doneTasks.map((t) => {
                    const cfg = STATUS_CONFIG[t.status];
                    return (
                      <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 opacity-70">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700">{t.title}</p>
                          {t.reportResult && <p className="mt-0.5 text-xs text-slate-400">Kết quả: {t.reportResult}</p>}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <button
                            onClick={() => openTask(t, "view")}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Eye size={12} />
                            Xem
                          </button>
                          <span className={clsx("flex items-center gap-1 rounded px-2 py-0.5 text-xs", cfg.color)}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{selectedTask.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {modalMode === "update" && canUpdateTask(selectedTask) ? "Cập nhật tiến độ xác minh" : "Xem chi tiết nhiệm vụ"}
                  </p>
                </div>
                <button onClick={() => setSelectedTask(null)}>
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Trạng thái</p>
                    <p className="mt-1 font-medium text-slate-800">{STATUS_CONFIG[selectedTask.status]?.label ?? selectedTask.status}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Hạn xử lý</p>
                    <p className="mt-1 text-slate-700">{selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleString("vi-VN") : "Chưa đặt"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Người nhận</p>
                    <p className="mt-1 text-slate-700">{selectedTask.assignee?.email ?? "Chưa phân công"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Người giao</p>
                    <p className="mt-1 text-slate-700">{selectedTask.assigner?.email ?? "TripNest"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Đối tượng</p>
                    <p className="mt-1 text-slate-700">{selectedTask.entityType ?? "Nhiệm vụ nội bộ"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Địa bàn</p>
                    <p className="mt-1 text-slate-700">{selectedTask.province?.name ?? "Chưa gắn địa bàn"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Mô tả</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{selectedTask.description || "Không có mô tả"}</p>
                  </div>

                  {(selectedTask.reportNotes || selectedTask.reportResult) && (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Biên bản hiện tại</p>
                      {selectedTask.reportResult && <p className="mt-2 text-sm text-slate-700">Kết quả: {selectedTask.reportResult}</p>}
                      {selectedTask.reportNotes && <p className="mt-1 text-sm leading-6 text-slate-700">{selectedTask.reportNotes}</p>}
                    </div>
                  )}

                  {modalMode === "update" && canUpdateTask(selectedTask) ? (
                    <form onSubmit={handleUpdate} className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Trạng thái</label>
                        <select
                          value={updateForm.status}
                          onChange={(e) => setUpdateForm((p) => ({ ...p, status: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value="IN_PROGRESS">Đang xử lý</option>
                          <option value="COMPLETED">Hoàn thành</option>
                          <option value="CANCELLED">Đã hủy</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Kết quả</label>
                        <select
                          value={updateForm.reportResult}
                          onChange={(e) => setUpdateForm((p) => ({ ...p, reportResult: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value="">Chọn kết quả</option>
                          <option value="PASS">PASS</option>
                          <option value="FAIL">FAIL</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Ghi chú</label>
                        <textarea
                          value={updateForm.reportNotes}
                          onChange={(e) => setUpdateForm((p) => ({ ...p, reportNotes: e.target.value }))}
                          rows={4}
                          className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => setSelectedTask(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
                          Đóng
                        </button>
                        <button type="submit" disabled={submitting} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                          {submitting ? "Đang lưu..." : "Lưu biên bản"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-end">
                      <button onClick={() => setSelectedTask(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
                        Đóng
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
