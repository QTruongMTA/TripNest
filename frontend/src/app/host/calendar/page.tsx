"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/lib/auth";

type CalendarProperty = {
  id: string;
  title: string;
  basePrice: number;
  blockedDates: Array<{ date: string; status: "BLOCKED" | "MAINTENANCE"; reason: string | null }>;
  dailyRates: Array<{ date: string; price: number; note: string | null }>;
  bookings: Array<{ id: string; checkIn: string | null; checkOut: string | null; status: string }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export default function Page() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [properties, setProperties] = useState<CalendarProperty[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availability, setAvailability] = useState("AVAILABLE");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const from = formatDate(startOfMonth(month));
  const to = formatDate(addMonths(startOfMonth(month), 1));

  const loadCalendar = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({ from, to });
      const response = await fetch(`${apiUrl}/host/calendar?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Không thể tải lịch.");
      setProperties(payload.data ?? []);
      setPropertyId((current) => current || payload.data?.[0]?.id || "");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Không thể tải lịch.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const property = properties.find((item) => item.id === propertyId) ?? null;
  const days = useMemo(() => buildCalendarDays(month), [month]);

  function openDate(date: string) {
    if (!property) return;
    const block = property.blockedDates.find((item) => item.date === date);
    const rate = property.dailyRates.find((item) => item.date === date);
    setSelectedDate(date);
    setAvailability(block?.status ?? "AVAILABLE");
    setPrice(rate ? String(rate.price) : "");
    setNote(rate?.note ?? block?.reason ?? "");
    setMessage(null);
  }

  async function saveDate() {
    const token = getAccessToken();
    if (!token || !property || !selectedDate) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/host/calendar/${property.id}/date`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          availability,
          price: price.trim() ? Number(price) : null,
          note,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Không thể cập nhật lịch.");
      setMessage("Đã cập nhật tình trạng và giá cho ngày đã chọn.");
      setSelectedDate(null);
      await loadCalendar();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Không thể cập nhật lịch.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Lịch vạn niên</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Giá và tình trạng phòng</h1>
            <p className="mt-2 text-sm text-slate-600">Khóa phòng, đánh dấu bảo trì hoặc đặt giá riêng cho từng ngày.</p>
          </div>
          <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="min-w-64 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            {properties.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </div>
      </div>

      {message ? <p className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-800">{message}</p> : null}
      {loading ? <p className="text-slate-500">Đang tải lịch...</p> : null}

      {!loading && property ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <button type="button" onClick={() => setMonth(addMonths(month, -1))} className="rounded-full border px-4 py-2">← Tháng trước</button>
            <h2 className="text-xl font-semibold">Tháng {month.getUTCMonth() + 1}/{month.getUTCFullYear()}</h2>
            <button type="button" onClick={() => setMonth(addMonths(month, 1))} className="rounded-full border px-4 py-2">Tháng sau →</button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="min-h-24" />;
              const date = formatDate(day);
              const block = property.blockedDates.find((item) => item.date === date);
              const rate = property.dailyRates.find((item) => item.date === date);
              const booked = property.bookings.some((item) => item.checkIn && item.checkOut && date >= item.checkIn && date < item.checkOut);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => openDate(date)}
                  className={`min-h-24 rounded-2xl border p-2 text-left transition hover:border-teal-500 ${
                    booked ? "border-blue-200 bg-blue-50" :
                    block?.status === "MAINTENANCE" ? "border-amber-200 bg-amber-50" :
                    block ? "border-rose-200 bg-rose-50" : "border-slate-200"
                  }`}
                >
                  <span className="font-semibold">{day.getUTCDate()}</span>
                  <span className="mt-2 block text-xs text-slate-600">{(rate?.price ?? property.basePrice).toLocaleString("vi-VN")} ₫</span>
                  <span className="mt-1 block text-[11px] font-medium">
                    {booked ? "Có khách" : block?.status === "MAINTENANCE" ? "Bảo trì" : block ? "Đã khóa" : rate ? "Giá riêng" : "Còn trống"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {selectedDate && property ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Cập nhật ngày {new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString("vi-VN")}</h2>
            <p className="mt-1 text-sm text-slate-500">Giá cơ bản: {property.basePrice.toLocaleString("vi-VN")} ₫</p>
            <label className="mt-5 grid gap-2 text-sm">
              <span>Tình trạng</span>
              <select value={availability} onChange={(event) => setAvailability(event.target.value)} className="rounded-2xl border px-4 py-3">
                <option value="AVAILABLE">Còn trống</option>
                <option value="BLOCKED">Khóa phòng</option>
                <option value="MAINTENANCE">Đang bảo trì</option>
              </select>
            </label>
            <label className="mt-4 grid gap-2 text-sm">
              <span>Giá riêng cho ngày này (để trống để dùng giá cơ bản)</span>
              <input type="number" min="1" value={price} onChange={(event) => setPrice(event.target.value)} className="rounded-2xl border px-4 py-3" />
            </label>
            <label className="mt-4 grid gap-2 text-sm">
              <span>Ghi chú</span>
              <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} className="rounded-2xl border px-4 py-3" />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setSelectedDate(null)} className="rounded-full border px-5 py-2">Hủy</button>
              <button type="button" onClick={saveDate} disabled={saving} className="rounded-full bg-teal-700 px-5 py-2 font-semibold text-white disabled:opacity-50">
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildCalendarDays(month: Date) {
  const first = startOfMonth(month);
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const days: Array<Date | null> = Array.from({ length: mondayOffset }, () => null);
  for (let day = 1; day <= count; day += 1) {
    days.push(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day)));
  }
  return days;
}
