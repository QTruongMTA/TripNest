"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, X } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Promo {
  id: string;
  code: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  usedCount: number;
  maxUses?: number | null;
  isActive: boolean;
  endDate: string;
  conditions?: string[];
  status: "ACTIVE" | "FULL" | "EXPIRED" | "INACTIVE";
}

const voucherTypes = ["Giảm giá Ngày lễ", "Khai trương", "Khách hàng mới", "Khác"];
const conditionOptions = [
  { value: "MIN_ORDER_500K", label: "Giá trị hóa đơn từ 500.000đ trở lên" },
  { value: "MIN_GUESTS_5", label: "Đặt phòng từ 5 người trở lên" },
];

function generateCode() {
  const letters = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
  const numbers = Array.from({ length: 6 }, () => String(Math.floor(Math.random() * 10))).join("");
  return `${letters}${numbers}`;
}

function formatDiscount(promo: Promo) {
  return promo.discountType === "PERCENTAGE"
    ? `${promo.discountValue}%`
    : `${promo.discountValue.toLocaleString("vi-VN")} ₫`;
}

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState(generateCode());
  const [expiresAt, setExpiresAt] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState(10);
  const [voucherType, setVoucherType] = useState(voucherTypes[0]);
  const [customType, setCustomType] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);

  const activeType = useMemo(() => voucherType === "Khác" ? customType.trim() || "Khác" : voucherType, [customType, voucherType]);

  useEffect(() => {
    loadPromos();
  }, []);

  async function loadPromos() {
    setLoading(true);
    try {
      const response = await api.get("/admin/promotions");
      setPromos(response.data.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  function toggleCondition(value: string) {
    setConditions((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function createVoucher() {
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/admin/promotions", {
        code,
        expiresAt,
        quantity,
        discountType,
        discountValue,
        voucherType: activeType,
        conditions,
      });
      setMessage("Đã tạo voucher hệ thống.");
      setShowForm(false);
      setCode(generateCode());
      setQuantity(10);
      setDiscountValue(10);
      setConditions([]);
      await loadPromos();
      setTimeout(() => setMessage(null), 2500);
    } catch (error: any) {
      setMessage(error.response?.data?.error?.message ?? "Không thể tạo voucher.");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalShell title="Khuyến mãi">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Voucher hệ thống áp dụng cho tất cả chỗ ở.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900"
          >
            <Plus size={16} />
            Thêm voucher
          </button>
        </div>

        {message ? (
          <div className="fixed right-6 top-6 z-50 rounded-lg bg-teal-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
            {message}
          </div>
        ) : null}

        {showForm ? (
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Tạo voucher hệ thống</h2>
                <p className="mt-1 text-sm text-slate-500">Mã này dùng được cho mọi chỗ ở nếu thỏa điều kiện.</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Mã voucher
                <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono outline-none focus:border-teal-800" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Hết hạn
                <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-teal-800" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Số lượng
                <div className="mt-1 flex">
                  <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 10))} className="rounded-l-md border border-slate-200 px-3">-10</button>
                  <input type="number" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} className="w-full border-y border-slate-200 px-3 py-2 text-center outline-none" />
                  <button type="button" onClick={() => setQuantity((value) => value + 10)} className="rounded-r-md border border-slate-200 px-3">+10</button>
                </div>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Giá trị giảm
                <div className="mt-1 flex">
                  <input type="number" value={discountValue} onChange={(event) => setDiscountValue(Math.max(1, Number(event.target.value)))} className="w-full rounded-l-md border border-slate-200 px-3 py-2 outline-none focus:border-teal-800" />
                  <select value={discountType} onChange={(event) => setDiscountType(event.target.value as "PERCENTAGE" | "FIXED_AMOUNT")} className="rounded-r-md border border-l-0 border-slate-200 px-3">
                    <option value="PERCENTAGE">%</option>
                    <option value="FIXED_AMOUNT">VNĐ</option>
                  </select>
                </div>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Loại voucher
                <select value={voucherType} onChange={(event) => setVoucherType(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-teal-800">
                  {voucherTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              {voucherType === "Khác" ? (
                <label className="text-sm font-medium text-slate-700">
                  Nhập loại voucher
                  <input value={customType} onChange={(event) => setCustomType(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-teal-800" />
                </label>
              ) : null}
            </div>

            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">Điều kiện</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {conditionOptions.map((condition) => (
                  <label key={condition.value} className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={conditions.includes(condition.value)} onChange={() => toggleCondition(condition.value)} className="h-4 w-4 accent-teal-800" />
                    {condition.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={createVoucher} disabled={saving || !code || !expiresAt} className="rounded-md bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50">
                {saving ? "Đang tạo..." : "Tạo voucher"}
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Mã</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Loại</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Giảm giá</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Đã dùng</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Hết hạn</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {promos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">Chưa có voucher hệ thống.</td>
                  </tr>
                ) : null}
                {promos.map((promo) => (
                  <tr key={promo.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-4">
                      <button type="button" onClick={() => navigator.clipboard?.writeText(promo.code)} className="inline-flex items-center gap-2 font-mono font-bold text-slate-800">
                        {promo.code}
                        <Copy size={14} className="text-slate-400" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{promo.description}</td>
                    <td className="px-6 py-4">{formatDiscount(promo)}</td>
                    <td className="px-6 py-4 text-slate-500">{promo.usedCount}{promo.maxUses ? ` / ${promo.maxUses}` : ""}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(`${promo.endDate}T00:00:00`).toLocaleDateString("vi-VN")}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded px-2 py-0.5 text-xs ${promo.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"}`}>
                        {promo.status === "ACTIVE" ? "Đang hoạt động" : promo.status === "FULL" ? "Đã đủ lượt" : promo.status === "EXPIRED" ? "Quá hạn" : "Đã tắt"}
                      </span>
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
