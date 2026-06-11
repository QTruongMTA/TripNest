"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Plus, ToggleLeft, ToggleRight, X } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";
import type { Operator, Province } from "@/types";

const ADJACENT_PROVINCE_CODES: Record<string, string[]> = {
  // Note: danh sách tiếp giáp này chỉ phục vụ UI gợi ý; có thể bổ sung dần.
  HN: ["HP", "BN", "HY", "PT", "NB"],
  HP: ["HN", "QN"],
  HUE: ["DNA", "QT"],
  DNA: ["HUE", "QNG"],
  CT: ["AG", "DT", "VL"],
  HCM: ["DN", "LA", "TN"],

  AG: ["CT", "DT", "VL"],
  BN: ["HN", "HY"],
  CB: ["LS", "LAI", "LC"],
  CM: ["VL", "CT"],
  DB: ["LAI", "SL", "LC"],
  DN: ["HCM", "LD"],
  DT: ["AG", "CT", "LA", "VL"],
  GL: ["KH", "LD"],
  HT: ["NA", "QT"],
  HY: ["HN", "BN"],
  KH: ["GL", "NT", "LD"],
  LAI: ["DB", "LC", "SL"],
  LD: ["DN", "GL", "NT"],
  LS: ["QN", "CB"],
  LC: ["LAI", "DB", "SL"],
  LA: ["HCM", "DT", "TN"],
  NA: ["HT", "TH"],
  NB: ["HN", "TH"],
  NT: ["KH", "LD", "QNG"],
  PT: ["HN", "LC", "SL"],
  QNG: ["DNA", "NT"],
  QN: ["HP", "LS"],
  QT: ["HUE", "HT"],
  SL: ["LC", "DB", "PT", "TH"],
  TN: ["HCM", "LA"],
  TNG: ["HN", "QN"],
  TH: ["NA", "NB", "SL"],
  VL: ["CT", "DT", "AG"],
};

function provinceTypeLabel(type: Province["type"]) {
  return type === "THANH_PHO" ? "TP" : "Tỉnh";
}

function hasOperator(province: Province) {
  return (province.operatorAssignments?.length ?? 0) > 0;
}

function getOperatorNumber(email: string) {
  const match = email.match(/^operator(\d{2})@tripnest\.vn$/);
  return match ? Number(match[1]) : null;
}

function getNextCredential(operators: Operator[]) {
  const usedNumbers = new Set(
    operators
      .map((operator) => getOperatorNumber(operator.email))
      .filter((value): value is number => value !== null)
  );

  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) nextNumber += 1;

  const id = nextNumber.toString().padStart(2, "0");
  return {
    id,
    email: `operator${id}@tripnest.vn`,
    password: `operator${id}`,
  };
}

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [selectedProvinceIds, setSelectedProvinceIds] = useState<string[]>([]);

  useEffect(() => {
    if (!showForm) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showForm]);

  async function load() {
    setLoading(true);
    setLoadError("");

    const [operatorResult, provinceResult] = await Promise.allSettled([
      api.get("/admin/operators"),
      api.get("/provinces"),
    ]);

    if (operatorResult.status === "fulfilled") {
      setOperators(operatorResult.value.data.data ?? []);
    } else {
      setLoadError("Không thể tải danh sách tài khoản nhân viên.");
    }

    if (provinceResult.status === "fulfilled") {
      setProvinces(provinceResult.value.data.data ?? []);
    } else {
      setLoadError((current) =>
        current
          ? `${current} Không thể tải danh sách tỉnh thành.`
          : "Không thể tải danh sách tỉnh thành."
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const credential = useMemo(() => getNextCredential(operators), [operators]);
  const provinceById = useMemo(() => new Map(provinces.map((province) => [province.id, province])), [provinces]);
  const selectedProvinces = selectedProvinceIds.map((id) => provinceById.get(id)).filter(Boolean) as Province[];
  const unmanagedCount = provinces.filter((province) => !hasOperator(province)).length;

  const sortedProvinces = useMemo(() => {
    return [...provinces].sort((a, b) => {
      const statusCompare = Number(hasOperator(a)) - Number(hasOperator(b));
      if (statusCompare !== 0) return statusCompare;
      return a.name.localeCompare(b.name, "vi");
    });
  }, [provinces]);

  const nearbyProvinces = useMemo(() => {
    const selectedCodes = new Set(selectedProvinces.map((province) => province.code));
    const neighborCodes = new Set<string>();

    selectedProvinces.forEach((province) => {
      (ADJACENT_PROVINCE_CODES[province.code] ?? []).forEach((code) => {
        if (!selectedCodes.has(code)) neighborCodes.add(code);
      });
    });

    return provinces
      .filter((province) => neighborCodes.has(province.code))
      .sort((a, b) => {
        const statusCompare = Number(hasOperator(a)) - Number(hasOperator(b));
        if (statusCompare !== 0) return statusCompare;
        return a.name.localeCompare(b.name, "vi");
      });
  }, [provinces, selectedProvinces]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/admin/operators/province", { provinceIds: selectedProvinceIds });
      setShowForm(false);
      setSelectedProvinceIds([]);
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

  function openCreateForm() {
    setError("");
    setSelectedProvinceIds([]);
    setShowForm(true);
  }

  function toggleProvince(province: Province) {
    if (hasOperator(province)) return;
    setSelectedProvinceIds((current) =>
      current.includes(province.id)
        ? current.filter((id) => id !== province.id)
        : [...current, province.id]
    );
  }

  function copyText(value: string) {
    navigator.clipboard?.writeText(value).catch(() => undefined);
  }

  function ProvinceRow({ province }: { province: Province }) {
    const assigned = hasOperator(province);
    const checked = selectedProvinceIds.includes(province.id);
    const operatorEmail = province.operatorAssignments?.[0]?.operator.email;

    return (
      <button
        type="button"
        disabled={assigned}
        onClick={() => toggleProvince(province)}
        className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition ${
          checked
            ? "border-teal-500 bg-teal-50 text-teal-900"
            : assigned
              ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
              : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/50"
        }`}
      >
        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
          checked ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white"
        }`}>
          {checked ? <Check size={13} /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{province.name}</span>
          {assigned ? <span className="block truncate text-xs text-slate-400">{operatorEmail}</span> : null}
        </span>
        <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{provinceTypeLabel(province.type)}</span>
      </button>
    );
  }

  return (
    <PortalShell title="Tài khoản nhân viên">
      <div className="space-y-6">
        {loadError && (
          <p className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {operators.length} tài khoản nhân viên trong hệ thống • còn {unmanagedCount} tỉnh thành chưa có nhân viên quản lý
          </p>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Tạo tài khoản
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center bg-transparent p-4 pt-24">
            <div className="flex max-h-[calc(100vh-8rem)] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl shadow-slate-950/20">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Tạo tài khoản</h3>
                  <p className="mt-1 text-sm text-slate-500">Chọn tỉnh thành quản lý cho tài khoản nhân viên được tạo tự động.</p>
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
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
                  {error && <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      ["Tài khoản", credential.email],
                      ["Mật khẩu", credential.password],
                    ].map(([label, value]) => (
                      <div key={label} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-500">{label}</p>
                          <p className="truncate font-mono text-sm font-semibold text-slate-900">{value}</p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Sao chép ${label}`}
                          onClick={() => copyText(value)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded text-slate-500 hover:bg-white hover:text-slate-900"
                        >
                          <Copy size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grid min-h-0 gap-4 lg:grid-cols-2">
                    <section className="min-h-0 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="font-semibold text-slate-800">Tỉnh và thành phố</h4>
                        <p className="text-xs text-slate-500">Còn {unmanagedCount} tỉnh thành chưa có nhân viên quản lý</p>
                      </div>
                      <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                        {sortedProvinces.map((province) => (
                          <ProvinceRow key={province.id} province={province} />
                        ))}
                      </div>
                    </section>

                    <section className="min-h-0 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="font-semibold text-slate-800">Tỉnh thành lân cận</h4>
                        <p className="text-xs text-slate-500">Có {nearbyProvinces.length} tỉnh thành lân cận</p>
                      </div>
                      <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                        {nearbyProvinces.length === 0 ? (
                          <p className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-8 text-center text-sm text-slate-400">
                            Chọn một tỉnh thành ở bảng bên trái để xem tỉnh thành tiếp giáp.
                          </p>
                        ) : (
                          nearbyProvinces.map((province) => <ProvinceRow key={province.id} province={province} />)
                        )}
                      </div>
                    </section>
                  </div>

                  {selectedProvinces.length > 0 && (
                    <div className="flex flex-wrap gap-2 rounded-md border border-teal-100 bg-teal-50 px-3 py-2">
                      {selectedProvinces.map((province) => (
                        <span key={province.id} className="rounded bg-white px-2 py-1 text-xs font-medium text-teal-800 shadow-sm">
                          {province.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-slate-300 px-5 py-2 text-sm text-slate-700 hover:bg-slate-50 sm:min-w-28">Hủy</button>
                  <button type="submit" disabled={submitting || selectedProvinceIds.length === 0} className="rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 sm:min-w-40">
                    {submitting ? "Đang tạo..." : "Tạo tài khoản"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Email</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Vai trò</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Tỉnh thành quản lý</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Trạng thái</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {operators.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-400">Chưa có tài khoản nhân viên nào.</td></tr>
                )}
                {operators.map((op) => (
                  <tr key={op.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-4 font-medium text-slate-800">{op.email}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${op.role === "OPERATOR_PROVINCE" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                        {op.role === "OPERATOR_PROVINCE" ? "Nhân viên vận hành" : "Nhân viên thực địa"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(op.operatorAssignments ?? []).map((a) => (
                          <span key={a.province.id} className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                            {a.province.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded px-2 py-0.5 text-xs ${op.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
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
