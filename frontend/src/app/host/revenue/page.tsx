"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth";

type FinanceItem = {
  id: string;
  bookingId: string;
  property: { id: string; title: string };
  checkIn: string | null;
  checkOut: string | null;
  grossAmount: number;
  platformFee: number;
  hostAmount: number;
  status: string;
  availableAt: string;
  paidAt: string | null;
};

export default function Page() {
  const [data, setData] = useState<{ summary: Record<string, number>; items: FinanceItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/host/finance`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json().then((payload) => ({ ok: res.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error?.message ?? "Không thể tải báo cáo tài chính.");
        setData(payload.data);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-teal-950/5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Tài chính</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Báo cáo doanh thu</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Báo cáo này chỉ dành cho host hiện tại: tổng booking đã hoàn tất, phí TripNest
          và số tiền host được nhận. Booking chỉ xuất hiện sau khi host hoàn tất trả phòng.
        </p>
      </div>

      {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">{error}</div> : null}

      {data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Stat title="Tổng tiền khách trả" value={data.summary.grossRevenue ?? 0} />
          <Stat title="Phí nền tảng" value={data.summary.platformFees ?? 0} />
          <Stat title="Doanh thu của host" value={data.summary.hostRevenue ?? 0} highlight />
          <Stat title="Chờ chi trả" value={data.summary.pending ?? 0} />
          <Stat title="Sẵn sàng chi trả" value={data.summary.available ?? 0} />
          <Stat title="Đã chi trả" value={data.summary.paid ?? 0} />
        </div>
      ) : null}

      {data ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900">Các quyết toán gần đây</div>
          <div className="divide-y divide-slate-100">
            {data.items.map((item) => (
              <div key={item.id} className="px-5 py-4">
                <div className="grid gap-3 md:grid-cols-[1.4fr_repeat(3,1fr)_auto] md:items-center">
                  <div>
                    <p className="font-medium text-slate-900">{item.property.title}</p>
                    <p className="text-sm text-slate-500">{item.checkIn ?? "—"} → {item.checkOut ?? "—"}</p>
                  </div>
                  <p className="text-sm text-slate-600">Khách trả: {item.grossAmount.toLocaleString("vi-VN")} ₫</p>
                  <p className="text-sm text-slate-600">Phí: {item.platformFee.toLocaleString("vi-VN")} ₫</p>
                  <p className="text-sm font-semibold text-slate-900">Host nhận: {item.hostAmount.toLocaleString("vi-VN")} ₫</p>
                  <button
                    type="button"
                    onClick={() => setExpandedId((current) => current === item.id ? null : item.id)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {expandedId === item.id ? "Ẩn" : "Chi tiết"}
                  </button>
                </div>

                {expandedId === item.id ? (
                  <div className="mt-4 grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <FinanceDetail label="Settlement ID" value={item.id} />
                    <FinanceDetail label="Booking ID" value={item.bookingId} />
                    <FinanceDetail label="Trạng thái" value={settlementLabel[item.status] ?? item.status} />
                    <FinanceDetail label="Có thể chi trả từ" value={new Date(item.availableAt).toLocaleString("vi-VN")} />
                    <FinanceDetail label="Ngày đã chi trả" value={item.paidAt ? new Date(item.paidAt).toLocaleString("vi-VN") : "Chưa chi trả"} />
                  </div>
                ) : null}
              </div>
            ))}
            {data.items.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Chưa có booking nào hoàn tất để ghi nhận doanh thu.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

const settlementLabel: Record<string, string> = {
  PENDING: "Chờ đủ điều kiện chi trả",
  AVAILABLE: "Sẵn sàng chi trả",
  PAID: "Đã chi trả",
  HELD: "Đang tạm giữ",
};

function Stat({ title, value, highlight = false }: { title: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <p className={highlight ? "text-sm text-emerald-700" : "text-sm text-slate-500"}>{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${highlight ? "text-emerald-900" : "text-slate-950"}`}>{value.toLocaleString("vi-VN")} ₫</p>
    </div>
  );
}

function FinanceDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 break-all font-medium text-slate-800">{value}</p>
    </div>
  );
}
