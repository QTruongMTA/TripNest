"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";
import { Plus, X } from "lucide-react";

interface SubOp { id: string; email: string; phone?: string; isActive: boolean; createdAt: string; assignedTasks?: { id: string }[]; }

export default function SubOperatorsPage() {
  const [subs, setSubs] = useState<SubOp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api.get("/operator/sub-operators").then((r) => setSubs(r.data.data ?? [])).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSubmitting(true);
    try {
      await api.post("/operator/sub-operators", form);
      setShowForm(false);
      setForm({ email: "", password: "", phone: "" });
      load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Tạo thất bại.");
    } finally { setSubmitting(false); }
  }

  return (
    <PortalShell title="Operator Con">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{subs.length} nhân viên thực địa</p>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
            <Plus size={16} /> Thêm Operator Con
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-slate-800">Thêm Operator Con</h3>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-slate-400" /></button>
              </div>
              {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
              <form onSubmit={handleCreate} className="space-y-4">
                {[
                  { label: "Email *", key: "email", type: "email" },
                  { label: "Mật khẩu *", key: "password", type: "password" },
                  { label: "Số điện thoại", key: "phone", type: "tel" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input type={type} value={(form as Record<string, string>)[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} required={label.includes("*")} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm">Hủy</button>
                  <button type="submit" disabled={submitting} className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                    {submitting ? "Đang tạo..." : "Tạo"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="grid gap-3">
            {subs.length === 0 && <div className="text-center text-slate-400 py-16 bg-white rounded-xl border border-slate-100">Chưa có nhân viên nào.</div>}
            {subs.map((s) => (
              <div key={s.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{s.email}</p>
                  {s.phone && <p className="text-sm text-slate-500">{s.phone}</p>}
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-xs ${s.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{s.isActive ? "Hoạt động" : "Bị khóa"}</span>
                  {(s.assignedTasks?.length ?? 0) > 0 && (
                    <p className="text-xs text-slate-400 mt-1">{s.assignedTasks?.length} nhiệm vụ đang chạy</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
