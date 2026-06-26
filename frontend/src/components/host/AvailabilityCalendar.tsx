"use client";

import { useCallback, useEffect, useState } from "react";

type DayState = "available" | "blocked" | "maintenance" | "booked";

type CalendarDay = {
  date: string;
  state: DayState;
  bookingId?: string;
  bookingStatus?: string;
  reason?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const MONTHS_VI = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
  "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
  "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function dayOfWeekMon0(dateStr: string): number {
  // Returns 0=Mon … 6=Sun for a YYYY-MM-DD string
  const d = new Date(`${dateStr}T00:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const dayBg: Record<DayState, string> = {
  available: "bg-white hover:bg-emerald-50 cursor-pointer",
  blocked: "bg-rose-100 hover:bg-rose-50 cursor-pointer text-rose-700",
  maintenance: "bg-amber-100 hover:bg-amber-50 cursor-pointer text-amber-700",
  booked: "bg-sky-100 text-sky-700 cursor-default",
};

const dayLabel: Record<DayState, string> = {
  available: "",
  blocked: "Chặn",
  maintenance: "Bảo trì",
  booked: "Booked",
};

export function AvailabilityCalendar({
  propertyId,
  token,
}: {
  propertyId: string;
  token: string;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [blockMode, setBlockMode] = useState<"block" | "unblock" | null>(null);

  const fetchCalendar = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/host/properties/${propertyId}/calendar?year=${y}&month=${m}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message ?? "Không tải được lịch");
      setDays(payload.data.days);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }, [propertyId, token]);

  useEffect(() => {
    fetchCalendar(year, month);
    setSelected(new Set());
    setBlockMode(null);
  }, [year, month, fetchCalendar]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  function toggleSelect(day: CalendarDay) {
    if (day.state === "booked") return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(day.date)) next.delete(day.date);
      else next.add(day.date);
      return next;
    });
    // Determine mode from the first selected day
    if (selected.size === 0) {
      setBlockMode(day.state === "available" ? "block" : "unblock");
    }
  }

  async function applyAction() {
    if (selected.size === 0 || !blockMode) return;
    setMutating(true);
    setError(null);
    try {
      const url = `${API_BASE}/host/properties/${propertyId}/availability/${blockMode}`;
      const method = blockMode === "block" ? "POST" : "DELETE";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ dates: Array.from(selected) }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message ?? "Thao tác thất bại");
      await fetchCalendar(year, month);
      setSelected(new Set());
      setBlockMode(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally {
      setMutating(false);
    }
  }

  // Build grid: leading empty cells + day cells
  const firstDayStr = `${year}-${pad2(month)}-01`;
  const leadingBlanks = dayOfWeekMon0(firstDayStr);
  const totalDays = daysInMonth(year, month);
  const dayMap = new Map(days.map(d => [d.date, d]));

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
          aria-label="Tháng trước"
        >
          ←
        </button>
        <h3 className="text-base font-semibold text-slate-800">
          {MONTHS_VI[month - 1]} {year}
        </h3>
        <button
          onClick={nextMonth}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
          aria-label="Tháng sau"
        >
          →
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-white ring-1 ring-slate-200" /> Trống</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-rose-200" /> Chặn</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-200" /> Bảo trì</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-sky-200" /> Đã đặt</span>
        {selected.size > 0 && (
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-500" /> Đang chọn ({selected.size})</span>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>
      )}

      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {/* Weekday headers */}
          {WEEKDAYS.map(wd => (
            <div key={wd} className="py-1 text-center text-xs font-medium text-slate-400">
              {wd}
            </div>
          ))}

          {/* Leading blanks */}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}

          {/* Day cells */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${pad2(month)}-${pad2(dayNum)}`;
            const day = dayMap.get(dateStr) ?? { date: dateStr, state: "available" as DayState };
            const isSelected = selected.has(dateStr);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => toggleSelect(day)}
                disabled={day.state === "booked"}
                title={day.state === "booked" ? `Đã đặt${day.bookingStatus ? ` (${day.bookingStatus})` : ""}` : dayLabel[day.state] || "Nhấn để chọn"}
                className={`relative flex min-h-[64px] flex-col rounded-lg border p-1 text-left text-xs transition
                  ${isSelected
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400"
                    : `border-slate-200 ${dayBg[day.state]}`
                  }
                  disabled:cursor-default disabled:opacity-90
                `}
              >
                <span className="font-semibold">{dayNum}</span>
                {day.state !== "available" && (
                  <span className="mt-auto truncate leading-tight opacity-70">
                    {dayLabel[day.state]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Action bar when days are selected */}
      {selected.size > 0 && blockMode && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm text-slate-600">
            Đã chọn <strong>{selected.size}</strong> ngày
          </span>
          <button
            type="button"
            onClick={applyAction}
            disabled={mutating}
            className={`ml-auto rounded-full px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50
              ${blockMode === "block" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}
            `}
          >
            {mutating
              ? "Đang xử lý..."
              : blockMode === "block"
              ? "Chặn các ngày đã chọn"
              : "Bỏ chặn các ngày đã chọn"
            }
          </button>
          <button
            type="button"
            onClick={() => { setSelected(new Set()); setBlockMode(null); }}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-white"
          >
            Hủy
          </button>
        </div>
      )}
    </div>
  );
}
