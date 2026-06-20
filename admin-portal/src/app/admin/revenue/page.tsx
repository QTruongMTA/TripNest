"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type Mode = "day" | "month";
type RevenueReport = {
  mode: Mode;
  value: string;
  summary: {
    grossAmount: number;
    platformRevenue: number;
    hostAmount: number;
    paidBookings: number;
    completedBookings: number;
    pendingRecognition: number;
    averagePlatformRevenue: number;
  };
  breakdown: Array<{
    label: string;
    grossAmount: number;
    platformRevenue: number;
    bookings: number;
  }>;
  transactions: Array<{
    id: string;
    bookingId: string;
    listing: string;
    guest: string;
    host: string;
    grossAmount: number;
    platformRevenue: number;
    hostAmount: number;
    bookingStatus: string;
    settlementStatus: string | null;
    confirmedBy: string;
    paidAt: string | null;
    recognizedAt: string | null;
  }>;
};

function vietnamToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function money(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

export default function RevenuePage() {
  const today = useMemo(vietnamToday, []);
  const [mode, setMode] = useState<Mode>("month");
  const [value, setValue] = useState(today.slice(0, 7));
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/admin/revenue", {
        params: { mode, value },
      });
      setReport(response.data.data);
    } catch {
      setError("Không thể tải báo cáo doanh thu.");
    } finally {
      setLoading(false);
    }
  }, [mode, value]);

  useEffect(() => {
    load();
  }, [load]);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setValue(nextMode === "day" ? today : today.slice(0, 7));
  }

  const maxRevenue = Math.max(
    1,
    ...(report?.breakdown.map((item) => item.grossAmount) ?? [])
  );

  return (
    <PortalShell title="Báo cáo doanh thu">
      <div className="space-y-6">
        <section className="portal-card p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                Tài chính hệ thống
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                Doanh thu TripNest
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Chỉ ghi nhận hoa hồng nền tảng sau khi booking đã check-out.
                Báo cáo này dành cho admin đối soát tiền khách trả, doanh thu TripNest
                và công nợ phải trả host. Host chỉ xem phần doanh thu cơ sở của mình.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => changeMode("day")}
                  className={`rounded-md px-4 py-2 text-sm font-semibold ${
                    mode === "day" ? "bg-white text-teal-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Theo ngày
                </button>
                <button
                  type="button"
                  onClick={() => changeMode("month")}
                  className={`rounded-md px-4 py-2 text-sm font-semibold ${
                    mode === "month" ? "bg-white text-teal-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Theo tháng
                </button>
              </div>
              <PeriodPicker
                mode={mode}
                value={value}
                onChange={setValue}
                today={today}
              />
            </div>
          </div>
        </section>

        {error ? <div className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}</div> : null}
        {loading ? <div className="portal-card p-12 text-center text-slate-500">Đang tải báo cáo...</div> : null}

        {!loading && report ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Metric label="Tiền khách thanh toán" value={money(report.summary.grossAmount)} />
              <Metric label="Doanh thu TripNest" value={money(report.summary.platformRevenue)} highlight />
              <Metric label="Phần của host" value={money(report.summary.hostAmount)} />
              <Metric
                label="Đã thanh toán / Chờ ghi nhận"
                value={`${report.summary.paidBookings} / ${report.summary.pendingRecognition}`}
              />
              <Metric label="Doanh thu TB/booking" value={money(report.summary.averagePlatformRevenue)} />
            </section>

            <section className="portal-card p-5">
              <h3 className="text-lg font-semibold text-slate-950">
                Thanh toán và doanh thu {mode === "day" ? "trong ngày" : "theo từng ngày trong tháng"}
              </h3>
              {report.breakdown.length ? (
                <div className="mt-6 space-y-4">
                  {report.breakdown.map((item) => (
                    <div key={item.label} className="grid gap-2 sm:grid-cols-[80px_1fr_170px] sm:items-center">
                      <span className="text-sm font-medium text-slate-600">{item.label}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-700"
                          style={{ width: `${Math.max(3, (item.grossAmount / maxRevenue) * 100)}%` }}
                        />
                      </div>
                      <span className="text-right text-sm font-semibold text-slate-800">
                        Khách trả {money(item.grossAmount)} · TripNest {money(item.platformRevenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm text-slate-500">
                  Chưa có booking check-out trong khoảng thời gian này.
                </p>
              )}
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="font-semibold text-slate-950">Chi tiết doanh thu đã ghi nhận</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Thanh toán</th>
                      <th className="px-5 py-3">Booking</th>
                      <th className="px-5 py-3">Chỗ ở / Tour</th>
                      <th className="px-5 py-3">Khách / Host</th>
                      <th className="px-5 py-3">Thu tiền bởi</th>
                      <th className="px-5 py-3 text-right">Khách trả</th>
                      <th className="px-5 py-3 text-right">TripNest</th>
                      <th className="px-5 py-3 text-right">Host nhận</th>
                      <th className="px-5 py-3">Ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.transactions.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-5 py-4 text-slate-500">
                          {item.paidAt ? new Date(item.paidAt).toLocaleString("vi-VN") : "—"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">{item.confirmedBy}</td>
                        <td className="px-5 py-4 font-mono text-xs">{item.bookingId}</td>
                        <td className="px-5 py-4 font-medium text-slate-800">{item.listing}</td>
                        <td className="px-5 py-4 text-slate-500">
                          <p>{item.guest}</p>
                          <p className="mt-1 text-xs">{item.host}</p>
                        </td>
                        <td className="px-5 py-4 text-right">{money(item.grossAmount)}</td>
                        <td className="px-5 py-4 text-right font-semibold text-teal-700">
                          {money(item.platformRevenue)}
                        </td>
                        <td className="px-5 py-4 text-right">{money(item.hostAmount)}</td>
                        <td className="px-5 py-4">
                          {item.recognizedAt ? (
                            <div>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                Đã ghi nhận
                              </span>
                              <p className="mt-2 text-xs text-slate-400">
                                {new Date(item.recognizedAt).toLocaleString("vi-VN")}
                              </p>
                            </div>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              Chờ check-out
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!report.transactions.length ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                          Không có giao dịch thanh toán trong thời gian này.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </PortalShell>
  );
}

function PeriodPicker({
  mode,
  value,
  onChange,
  today,
}: {
  mode: Mode;
  value: string;
  onChange: (value: string) => void;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(Number(value.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(
    mode === "day" ? Number(value.slice(5, 7)) - 1 : new Date().getMonth()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewYear(Number(value.slice(0, 4)));
    if (mode === "day") setViewMonth(Number(value.slice(5, 7)) - 1);
  }, [mode, value]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const displayValue =
    mode === "day"
      ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN")
      : `Tháng ${Number(value.slice(5, 7))}/${value.slice(0, 4)}`;

  function moveMonth(offset: number) {
    const next = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function pickDay(day: number) {
    onChange(
      `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
    setOpen(false);
  }

  function pickMonth(month: number) {
    onChange(`${viewYear}-${String(month + 1).padStart(2, "0")}`);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-w-48 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-teal-500"
      >
        <span>{displayValue}</span>
        <CalendarDays size={17} className="text-teal-700" />
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/15">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => mode === "day" ? moveMonth(-1) : setViewYear((year) => year - 1)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label={mode === "day" ? "Tháng trước" : "Năm trước"}
            >
              <ChevronLeft size={18} />
            </button>
            <p className="font-semibold text-slate-900">
              {mode === "day"
                ? `Tháng ${viewMonth + 1}/${viewYear}`
                : `Năm ${viewYear}`}
            </p>
            <button
              type="button"
              onClick={() => mode === "day" ? moveMonth(1) : setViewYear((year) => year + 1)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label={mode === "day" ? "Tháng sau" : "Năm sau"}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {mode === "day" ? (
            <DayGrid
              year={viewYear}
              month={viewMonth}
              selected={value}
              today={today}
              onSelect={pickDay}
            />
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, month) => {
                const selected =
                  value === `${viewYear}-${String(month + 1).padStart(2, "0")}`;
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => pickMonth(month)}
                    className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                      selected
                        ? "bg-teal-700 text-white"
                        : "bg-slate-50 text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                    }`}
                  >
                    Tháng {month + 1}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onChange(mode === "day" ? today : today.slice(0, 7));
              setOpen(false);
            }}
            className="mt-4 w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100"
          >
            {mode === "day" ? "Chọn hôm nay" : "Chọn tháng này"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DayGrid({
  year,
  month,
  selected,
  today,
  onSelect,
}: {
  year: number;
  month: number;
  selected: string;
  today: string;
  onSelect: (day: number) => void;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <>
      <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-slate-400">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
          <span key={label} className="py-2">{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;
          const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = selected === date;
          const isToday = today === date;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(day)}
              className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-medium transition ${
                isSelected
                  ? "bg-teal-700 text-white"
                  : isToday
                    ? "bg-amber-100 text-amber-800"
                    : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-5 shadow-sm ${
      highlight ? "border-amber-300 bg-amber-50" : "border-slate-100 bg-white"
    }`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${
        highlight ? "text-teal-900" : "text-slate-950"
      }`}>
        {value}
      </p>
    </div>
  );
}
