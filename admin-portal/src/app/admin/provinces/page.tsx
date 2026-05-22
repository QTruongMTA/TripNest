"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";
import type { Province } from "@/types";
import { Plus, MapPin, X } from "lucide-react";

export default function ProvincesPage() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", type: "TINH" as "TINH" | "THANH_PHO" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api.get("/provinces").then((r) => setProvinces(r.data.data ?? [])).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSubmitting(true);
    try {
      await api.post("/provinces", form);
      setShowForm(false);
      setForm({ name: "", code: "", type: "TINH" });
      load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  const cities = provinces.filter((p) => p.type === "THANH_PHO");
  const tinh = provinces.filter((p) => p.type === "TINH");

  return (
    <PortalShell title="Tỉnh / Thành phố">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{provinces.length} đơn vị hành chính • {cities.length} thành phố • {tinh.length} tỉnh</p>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
            <Plus size={16} /> Thêm tỉnh
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-slate-800">Thêm tỉnh / thành phố</h3>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-slate-400" /></button>
              </div>
              {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tên *</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mã tỉnh *</label>
                  <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Loại</label>
                  <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as "TINH" | "THANH_PHO" }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="TINH">Tỉnh</option>
                    <option value="THANH_PHO">Thành phố trực thuộc TW</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm">Hủy</button>
                  <button type="submit" disabled={submitting} className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                    {submitting ? "Đang lưu..." : "Thêm"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[{ label: "Thành phố trực thuộc TW", items: cities }, { label: "Tỉnh", items: tinh }].map(({ label, items }) => (
              <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-700 mb-4">{label} ({items.length})</h3>
                <div className="space-y-2">
                  {items.map((p) => {
                    const op = p.operatorAssignments?.[0]?.operator;
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-700">{p.name}</span>
                          <span className="text-xs text-slate-400 font-mono">{p.code}</span>
                        </div>
                        {op ? (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{op.email}</span>
                        ) : (
                          <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded">Chưa có Operator</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
