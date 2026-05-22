"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";
import type { Operator, Province } from "@/types";
import { Plus, ToggleLeft, ToggleRight, X } from "lucide-react";

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [availableProvinces, setAvailableProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "", password: "", phone: "", provinceIds: [] as string[],
  });

  function load() {
    setLoading(true);
    Promise.all([
      api.get("/admin/operators"),
      api.get("/provinces"),
      api.get("/provinces/available"),
    ]).then(([opRes, prvRes, avRes]) => {
      setOperators(opRes.data.data ?? []);
      setProvinces(prvRes.data.data ?? []);
      setAvailableProvinces(avRes.data.data ?? []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSubmitting(true);
    try {
      await api.post("/admin/operators/province", form);
      setShowForm(false);
      setForm({ email: "", password: "", phone: "", provinceIds: [] });
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? "Tạo tài khoản thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(op: Operator) {
    await api.patch(`/admin/operators/${op.id}`, { isActive: !op.isActive });
    load();
  }

  function toggleProvince(id: string) {
    setForm((prev) => ({
      ...prev,
      provinceIds: prev.provinceIds.includes(id)
        ? prev.provinceIds.filter((p) => p !== id)
        : [...prev.provinceIds, id],
    }));
  }

  return (
    <PortalShell title="Quản lý Operator">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{operators.length} operator trong hệ thống</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            <Plus size={16} /> Tạo Operator Tỉnh
          </button>
        </div>

        {/* Create form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl shadow-slate-950/20">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Tạo Operator Tỉnh</h3>
                  <p className="mt-1 text-sm text-slate-500">Thiết lập tài khoản và tỉnh / thành phố phụ trách.</p>
                </div>
                <button
                  type="button"
                  aria-label="Đóng"
                  onClick={() => setShowForm(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                  {error && <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Số điện thoại</label>
                    <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Mật khẩu *</label>
                    <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tỉnh / Thành phố quản lý *</label>
                    <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-300 p-2">
                      {availableProvinces.length === 0 && (
                        <p className="text-slate-400 text-xs p-2">Tất cả tỉnh đã có Operator.</p>
                      )}
                      {availableProvinces.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.provinceIds.includes(p.id)}
                            onChange={() => toggleProvince(p.id)}
                            className="accent-brand-600"
                          />
                          <span className="text-sm text-slate-700">{p.name}</span>
                          <span className="ml-auto text-xs text-slate-400">{p.type === "THANH_PHO" ? "TP" : "Tỉnh"}</span>
                        </label>
                      ))}
                    </div>
                    {form.provinceIds.length > 0 && (
                      <p className="text-xs text-brand-600 mt-1">Đã chọn {form.provinceIds.length} tỉnh</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-5 py-2 text-sm text-slate-700 hover:bg-slate-50 sm:min-w-28">Hủy</button>
                  <button type="submit" disabled={submitting || form.provinceIds.length === 0} className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 sm:min-w-40">
                    {submitting ? "Đang tạo..." : "Tạo tài khoản"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Operators list */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Email</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Vai trò</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Tỉnh quản lý</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Trạng thái</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {operators.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-slate-400 py-12">Chưa có Operator nào.</td></tr>
                )}
                {operators.map((op) => (
                  <tr key={op.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-4 font-medium text-slate-800">{op.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${op.role === "OPERATOR_PROVINCE" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                        {op.role === "OPERATOR_PROVINCE" ? "Operator Tỉnh" : "Operator Con"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(op.operatorAssignments ?? []).map((a) => (
                          <span key={a.province.id} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs">{a.province.name}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${op.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {op.isActive ? "Hoạt động" : "Bị khóa"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => toggleActive(op)} className="text-slate-400 hover:text-slate-700" title={op.isActive ? "Khóa" : "Mở khóa"}>
                        {op.isActive ? <ToggleRight size={20} className="text-brand-600" /> : <ToggleLeft size={20} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
