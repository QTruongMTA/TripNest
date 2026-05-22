"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import type { OperatorTask } from "@/types";
import { Plus, X, Clock, CheckCircle2, AlertCircle } from "lucide-react";
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
  const [updateModal, setUpdateModal] = useState<OperatorTask | null>(null);
  const [form, setForm] = useState({ title: "", description: "", assignedTo: "", dueDate: "" });
  const [updateForm, setUpdateForm] = useState({ status: "IN_PROGRESS", reportNotes: "", reportResult: "" });
  const [subs, setSubs] = useState<{ id: string; email: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isProvince = user?.role === "OPERATOR_PROVINCE";

  function load() {
    api.get("/operator/tasks").then((r) => setTasks(r.data.data ?? [])).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    if (isProvince) {
      api.get("/operator/sub-operators").then((r) => setSubs(r.data.data ?? []));
    }
  }, [isProvince]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/operator/tasks", form);
      setShowForm(false);
      setForm({ title: "", description: "", assignedTo: "", dueDate: "" });
      load();
    } finally { setSubmitting(false); }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!updateModal) return;
    setSubmitting(true);
    try {
      await api.patch(`/operator/tasks/${updateModal.id}`, updateForm);
      setUpdateModal(null);
      load();
    } finally { setSubmitting(false); }
  }

  const activeTasks = tasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((t) => t.status === "COMPLETED" || t.status === "CANCELLED");

  return (
    <PortalShell title={isProvince ? "Quản lý Nhiệm vụ" : "Nhiệm vụ của tôi"}>
      <div className="space-y-6">
        {isProvince && (
          <div className="flex justify-end">
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
              <Plus size={16} /> Giao nhiệm vụ
            </button>
          </div>
        )}

        {/* Create task modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-slate-800">Giao nhiệm vụ</h3>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-slate-400" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tiêu đề *</label>
                  <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mô tả</label>
                  <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Giao cho *</label>
                  <select value={form.assignedTo} onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">Chọn Operator con</option>
                    {subs.map((s) => <option key={s.id} value={s.id}>{s.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hạn chót</label>
                  <input type="datetime-local" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm">Hủy</button>
                  <button type="submit" disabled={submitting} className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                    {submitting ? "Đang giao..." : "Giao nhiệm vụ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update status modal (sub only) */}
        {updateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Cập nhật tiến độ</h3>
                <button onClick={() => setUpdateModal(null)}><X size={20} className="text-slate-400" /></button>
              </div>
              <p className="text-sm text-slate-600 mb-4 bg-slate-50 rounded-lg px-3 py-2">{updateModal.title}</p>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Trạng thái</label>
                  <select value={updateForm.status} onChange={(e) => setUpdateForm((p) => ({ ...p, status: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="IN_PROGRESS">Đang xử lý</option>
                    <option value="COMPLETED">Hoàn thành</option>
                    <option value="CANCELLED">Hủy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Kết quả</label>
                  <select value={updateForm.reportResult} onChange={(e) => setUpdateForm((p) => ({ ...p, reportResult: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">Chưa có</option>
                    <option value="PASS">Đạt</option>
                    <option value="FAIL">Không đạt</option>
                    <option value="NEED_MORE">Cần bổ sung</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú báo cáo</label>
                  <textarea value={updateForm.reportNotes} onChange={(e) => setUpdateForm((p) => ({ ...p, reportNotes: e.target.value }))} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setUpdateModal(null)} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm">Hủy</button>
                  <button type="submit" disabled={submitting} className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                    {submitting ? "Đang lưu..." : "Cập nhật"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="space-y-6">
            {/* Active tasks */}
            <div>
              <h2 className="text-sm font-semibold text-slate-600 mb-3">Đang xử lý ({activeTasks.length})</h2>
              {activeTasks.length === 0 && <p className="text-slate-400 text-sm">Không có nhiệm vụ nào đang chạy.</p>}
              <div className="grid gap-3">
                {activeTasks.map((t) => {
                  const cfg = STATUS_CONFIG[t.status];
                  return (
                    <div key={t.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{t.title}</p>
                          {t.description && <p className="text-sm text-slate-500 mt-0.5">{t.description}</p>}
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className={clsx("flex items-center gap-1 px-2 py-0.5 rounded text-xs", cfg.color)}>{cfg.icon}{cfg.label}</span>
                            {t.dueDate && <span className="text-xs text-slate-400">Hạn: {new Date(t.dueDate).toLocaleDateString("vi-VN")}</span>}
                            {t.assignee && <span className="text-xs text-slate-400">→ {t.assignee.email}</span>}
                            {t.assigner && <span className="text-xs text-slate-400">Từ: {t.assigner.email}</span>}
                          </div>
                        </div>
                        {!isProvince && (
                          <button onClick={() => { setUpdateModal(t); setUpdateForm({ status: "IN_PROGRESS", reportNotes: "", reportResult: "" }); }} className="flex-shrink-0 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-100">
                            Cập nhật
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Done tasks */}
            {doneTasks.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-600 mb-3">Đã hoàn thành ({doneTasks.length})</h2>
                <div className="grid gap-2">
                  {doneTasks.map((t) => {
                    const cfg = STATUS_CONFIG[t.status];
                    return (
                      <div key={t.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between opacity-70">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{t.title}</p>
                          {t.reportResult && <p className="text-xs text-slate-400 mt-0.5">Kết quả: {t.reportResult}</p>}
                        </div>
                        <span className={clsx("flex items-center gap-1 px-2 py-0.5 rounded text-xs", cfg.color)}>{cfg.icon}{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
