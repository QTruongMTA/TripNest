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
          TripNest tách rõ tiền khách đã trả, phí nền tảng, và phần host được nhận sau khi đối soát.
        </p>
      </div>

      {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">{error}</div> : null}

      {data ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Stat title="Gross" value={data.summary.grossRevenue ?? 0} />
          <Stat title="Phí nền tảng" value={data.summary.platformFees ?? 0} />
          <Stat title="Host revenue" value={data.summary.hostRevenue ?? 0} />
          <Stat title="Chờ chi trả" value={data.summary.pending ?? 0} />
        </div>
      ) : null}

      {data ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900">Các quyết toán gần đây</div>
          <div className="divide-y divide-slate-100">
            {data.items.map((item) => (
              <div key={item.id} className="grid gap-2 px-5 py-4 md:grid-cols-5 md:items-center">
                <div>
                  <p className="font-medium text-slate-900">{item.property.title}</p>
                  <p className="text-sm text-slate-500">{item.checkIn ?? "—"} → {item.checkOut ?? "—"}</p>
                </div>
                <p className="text-sm text-slate-600">Gross: {item.grossAmount.toLocaleString("vi-VN")} ₫</p>
                <p className="text-sm text-slate-600">Phí: {item.platformFee.toLocaleString("vi-VN")} ₫</p>
                <p className="text-sm text-slate-600">Host: {item.hostAmount.toLocaleString("vi-VN")} ₫</p>
                <p className="text-sm text-slate-600">{item.status}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value.toLocaleString("vi-VN")} ₫</p>
    </div>
  );
}
