"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

// ── Inline icon helpers ────────────────────────────────────────────────────────
function IconChevronLeft() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function IconChevronRight() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
}
function IconX({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function IconRotate({ size = 13 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-8.75"/></svg>;
}
function IconLock({ size = 12 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
}
function IconUnlock({ size = 12 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Property {
  id: string;
  title: string;
  pricePerNight: number;
}

interface DayData {
  date: string;
  state: "available" | "booked" | "blocked" | "maintenance";
  bookingId?: string;
  reason?: string;
  price?: number | null;
  minStay?: number | null;
  maxStay?: number | null;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
  note?: string | null;
}

interface EditValues {
  useCustomPrice: boolean;
  price: string;
  minStay: string;
  maxStay: string;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  note: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "₫";
}

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

// ISO weekday for the 1st day of month (0=Mon…6=Sun)
function firstWeekday(year: number, month: number) {
  const jsDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

// ── Day cell ──────────────────────────────────────────────────────────────────

type DayState = "available" | "booked" | "blocked" | "maintenance";

const STATE_BG: Record<DayState, string> = {
  available: "bg-white hover:bg-teal-50",
  booked: "bg-indigo-50",
  blocked: "bg-slate-100",
  maintenance: "bg-amber-50",
};

const STATE_TEXT: Record<DayState, string> = {
  available: "text-slate-700",
  booked: "text-indigo-600",
  blocked: "text-slate-400",
  maintenance: "text-amber-700",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function HostCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropId, setSelectedPropId] = useState<string>("");
  const [dayMap, setDayMap] = useState<Map<string, DayData>>(new Map());
  const [loading, setLoading] = useState(false);

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const dragStartRef = useRef<string | null>(null);
  const isDragging = useRef(false);

  // Edit panel
  const [editValues, setEditValues] = useState<EditValues>({
    useCustomPrice: false,
    price: "",
    minStay: "",
    maxStay: "",
    closedToArrival: false,
    closedToDeparture: false,
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // ── Load properties ─────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/host/properties").then((r: { data: { data?: Array<{ id: string; title: string; pricePerNight: number }> } }) => {
      const list: Property[] = (r.data.data ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        pricePerNight: Number(p.pricePerNight ?? 0),
      }));
      setProperties(list);
      if (list.length > 0 && !selectedPropId) setSelectedPropId(list[0]!.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load calendar ───────────────────────────────────────────────────────────
  const loadCalendar = useCallback(() => {
    if (!selectedPropId) return;
    setLoading(true);
    api
      .get(`/host/properties/${selectedPropId}/calendar?year=${year}&month=${month}`)
      .then((r: { data: { data?: { days?: DayData[] } } }) => {
        const days: DayData[] = r.data.data?.days ?? [];
        setDayMap(new Map(days.map((d) => [d.date, d])));
        setSelected(new Set());
      })
      .finally(() => setLoading(false));
  }, [selectedPropId, year, month]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  // ── Selection helpers ────────────────────────────────────────────────────────
  function toggleDay(dateKey: string) {
    const d = dayMap.get(dateKey);
    if (d?.state === "booked") return; // can't select booked days
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }

  function selectRange(startKey: string, endKey: string) {
    const [a, b] = startKey <= endKey ? [startKey, endKey] : [endKey, startKey];
    const keys: string[] = [];
    const cursor = new Date(`${a}T00:00:00Z`);
    const end = new Date(`${b}T00:00:00Z`);
    while (cursor <= end) {
      const k = cursor.toISOString().slice(0, 10);
      if (dayMap.get(k)?.state !== "booked") keys.push(k);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    setSelected(new Set(keys));
  }

  // Detect whether selected days have mixed (differing) settings
  const hasMixedValues = useMemo(() => {
    if (selected.size <= 1) return false;
    const days = Array.from(selected).map((k) => dayMap.get(k));
    const first = days[0];
    return days.some(
      (d) =>
        (d?.price ?? null) !== (first?.price ?? null) ||
        (d?.minStay ?? null) !== (first?.minStay ?? null) ||
        (d?.closedToArrival ?? false) !== (first?.closedToArrival ?? false),
    );
  }, [selected, dayMap]);

  // Populate edit panel when selection changes
  useEffect(() => {
    if (selected.size === 0) return;
    // Use first selected day's values as defaults
    const first = Array.from(selected).sort()[0]!;
    const d = dayMap.get(first);
    setEditValues({
      useCustomPrice: d?.price != null,
      price: d?.price != null ? String(d.price) : "",
      minStay: d?.minStay ? String(d.minStay) : "",
      maxStay: d?.maxStay ? String(d.maxStay) : "",
      closedToArrival: d?.closedToArrival ?? false,
      closedToDeparture: d?.closedToDeparture ?? false,
      note: d?.note ?? "",
    });
    setSaveMsg("");
  }, [selected, dayMap]);

  // ── Save daily rates ─────────────────────────────────────────────────────────
  async function handleApply() {
    if (selected.size === 0 || !selectedPropId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const price = editValues.useCustomPrice && editValues.price ? Number(editValues.price) : null;
      const items = Array.from(selected).map((date) => ({
        date,
        price: editValues.useCustomPrice ? price : null,
        minStay: editValues.minStay ? Number(editValues.minStay) : null,
        maxStay: editValues.maxStay ? Number(editValues.maxStay) : null,
        closedToArrival: editValues.closedToArrival,
        closedToDeparture: editValues.closedToDeparture,
        note: editValues.note.trim() || null,
      }));
      await api.put(`/host/properties/${selectedPropId}/daily-rates`, { items });
      setSaveMsg("Đã lưu.");
      loadCalendar();
    } catch {
      setSaveMsg("Lỗi khi lưu. Thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearRates() {
    if (selected.size === 0 || !selectedPropId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const items = Array.from(selected).map((date) => ({ date, _delete: true }));
      await api.put(`/host/properties/${selectedPropId}/daily-rates`, { items });
      setSaveMsg("Đã xoá thiết lập.");
      loadCalendar();
    } catch {
      setSaveMsg("Lỗi khi xoá. Thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function handleBlock() {
    if (selected.size === 0 || !selectedPropId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await api.post(`/host/properties/${selectedPropId}/availability/block`, { dates: Array.from(selected) });
      setSaveMsg("Đã đóng cửa.");
      loadCalendar();
    } catch {
      setSaveMsg("Lỗi. Thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnblock() {
    if (selected.size === 0 || !selectedPropId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await api.delete(`/host/properties/${selectedPropId}/availability/unblock`, { data: { dates: Array.from(selected) } });
      setSaveMsg("Đã mở cửa.");
      loadCalendar();
    } catch {
      setSaveMsg("Lỗi. Thử lại.");
    } finally {
      setSaving(false);
    }
  }

  // ── Calendar grid ────────────────────────────────────────────────────────────
  const { cells, totalDays } = useMemo(() => {
    const total = daysInMonth(year, month);
    const offset = firstWeekday(year, month);
    return { cells: offset, totalDays: total };
  }, [year, month]);

  const selectedProp = properties.find((p) => p.id === selectedPropId);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Lịch giá & tình trạng phòng</h1>
            <p className="text-sm text-slate-500">Đặt giá theo ngày, phụ phí, giới hạn lưu trú, đóng/mở cửa.</p>
          </div>

          {/* Property selector */}
          {properties.length > 1 && (
            <select
              value={selectedPropId}
              onChange={(e) => { setSelectedPropId(e.target.value); setSelected(new Set()); }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          {/* ── Calendar panel ── */}
          <div className="flex-1 min-w-0">
            <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
              {/* Month nav */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <button onClick={prevMonth} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100">
                  <IconChevronLeft />
                </button>
                <div className="text-center">
                  <p className="text-base font-semibold text-slate-800">
                    Tháng {month}/{year}
                  </p>
                  {selectedProp && (
                    <p className="text-xs text-slate-400">
                      {selectedProp.title} · Giá cơ bản {formatVND(selectedProp.pricePerNight)}/đêm
                    </p>
                  )}
                </div>
                <button onClick={nextMonth} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100">
                  <IconChevronRight />
                </button>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-100 px-5 py-2.5 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-white border border-slate-200" />Trống</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-indigo-100" />Đã đặt</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-slate-200" />Đóng cửa</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-100" />Bảo trì</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Giá riêng</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" />Hạn chế đến/đi</span>
                <span className="flex items-center gap-1.5"><span className="rounded bg-slate-700 px-1 text-[9px] text-white">≥N</span>Min stay</span>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
                </div>
              ) : (
                <div className="p-3 sm:p-4">
                  {/* Weekday header */}
                  <div className="mb-1 grid grid-cols-7 gap-1">
                    {WEEKDAY_LABELS.map((label) => (
                      <div key={label} className="py-1 text-center text-xs font-medium text-slate-400">{label}</div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells before month starts */}
                    {Array.from({ length: cells }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}

                    {/* Day cells */}
                    {Array.from({ length: totalDays }).map((_, i) => {
                      const day = i + 1;
                      const dateKey = toKey(year, month, day);
                      const d = dayMap.get(dateKey);
                      const state = (d?.state ?? "available") as DayState;
                      const isSelected = selected.has(dateKey);
                      const isBooked = state === "booked";
                      const hasPrice = d?.price != null;
                      const hasClosed = !!(d?.closedToArrival || d?.closedToDeparture);
                      const hasMinStay = !!(d?.minStay && d.minStay > 1);

                      return (
                        <div
                          key={dateKey}
                          onMouseDown={() => {
                            if (isBooked) return;
                            isDragging.current = true;
                            dragStartRef.current = dateKey;
                            toggleDay(dateKey);
                          }}
                          onMouseEnter={() => {
                            if (!isDragging.current || !dragStartRef.current || isBooked) return;
                            selectRange(dragStartRef.current, dateKey);
                          }}
                          onMouseUp={() => { isDragging.current = false; }}
                          className={[
                            "relative min-h-[72px] select-none rounded-lg p-1.5 text-left transition overflow-hidden",
                            isBooked ? "cursor-default" : "cursor-pointer",
                            isSelected
                              ? "ring-2 ring-teal-500 bg-teal-50"
                              : STATE_BG[state],
                          ].join(" ")}
                        >
                          {/* Colored top-border stripe for overrides (not selected/booked/blocked) */}
                          {state === "available" && !isSelected && (hasPrice || hasClosed) && (
                            <div className="absolute top-0 inset-x-0 h-[3px] rounded-t-lg flex overflow-hidden">
                              {hasPrice && <div className={`h-full ${hasClosed ? "w-1/2" : "w-full"} bg-amber-400`} />}
                              {hasClosed && <div className={`h-full ${hasPrice ? "w-1/2" : "w-full"} bg-rose-400`} />}
                            </div>
                          )}

                          {/* Date number */}
                          <span className={`text-xs font-semibold ${isSelected ? "text-teal-700" : STATE_TEXT[state]}`}>
                            {day}
                          </span>

                          {/* Price */}
                          <div className="mt-0.5 text-[11px] leading-tight font-medium">
                            {state === "booked" ? (
                              <span className="text-indigo-400 text-[10px]">đặt</span>
                            ) : state === "blocked" ? (
                              <span className="text-slate-400 text-[10px]">đóng</span>
                            ) : state === "maintenance" ? (
                              <span className="text-amber-600 text-[10px]">bảo trì</span>
                            ) : hasPrice ? (
                              <span className="text-amber-600">{(d!.price! / 1000).toFixed(0)}k</span>
                            ) : selectedProp ? (
                              <span className="text-slate-300">{(selectedProp.pricePerNight / 1000).toFixed(0)}k</span>
                            ) : null}
                          </div>

                          {/* Bottom badges: minStay + closed indicators */}
                          {(hasMinStay || hasClosed) && (
                            <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center gap-0.5 flex-wrap">
                              {hasMinStay && (
                                <span className="rounded bg-slate-700 px-0.5 text-[9px] text-white leading-tight">≥{d!.minStay}</span>
                              )}
                              {d?.closedToArrival && (
                                <span title="Đóng check-in" className="rounded bg-rose-100 px-0.5 text-[9px] text-rose-600 leading-tight">→✕</span>
                              )}
                              {d?.closedToDeparture && (
                                <span title="Đóng check-out" className="rounded bg-rose-100 px-0.5 text-[9px] text-rose-600 leading-tight">✕←</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Edit panel ── */}
          <div className="w-full lg:w-72 shrink-0">
            {selected.size === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                <p className="text-sm text-slate-400">Nhấp hoặc kéo chọn ngày để chỉnh giá & tình trạng.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {selected.size} ngày đã chọn
                  </p>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="grid h-6 w-6 place-items-center rounded hover:bg-slate-100"
                  >
                    <IconX size={14} />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Mixed values warning */}
                  {hasMixedValues && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                      Các ngày được chọn có thiết lập <strong>khác nhau</strong>. Áp dụng sẽ ghi đè tất cả bằng giá trị hiện tại.
                    </div>
                  )}

                  {/* Price */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Giá/đêm</label>
                    <div className="flex items-center gap-2 mb-1.5">
                      <input
                        type="checkbox"
                        id="useCustomPrice"
                        checked={editValues.useCustomPrice}
                        onChange={(e) => setEditValues((v) => ({ ...v, useCustomPrice: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <label htmlFor="useCustomPrice" className="text-xs text-slate-600 cursor-pointer">Dùng giá riêng</label>
                    </div>
                    {editValues.useCustomPrice && (
                      <div className="relative">
                        <input
                          type="number"
                          value={editValues.price}
                          onChange={(e) => setEditValues((v) => ({ ...v, price: e.target.value }))}
                          placeholder={selectedProp ? String(selectedProp.pricePerNight) : "0"}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₫</span>
                      </div>
                    )}
                  </div>

                  {/* Min/Max Stay */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Tối thiểu (đêm)</label>
                      <input
                        type="number"
                        min={1}
                        value={editValues.minStay}
                        onChange={(e) => setEditValues((v) => ({ ...v, minStay: e.target.value }))}
                        placeholder="—"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Tối đa (đêm)</label>
                      <input
                        type="number"
                        min={1}
                        value={editValues.maxStay}
                        onChange={(e) => setEditValues((v) => ({ ...v, maxStay: e.target.value }))}
                        placeholder="—"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  {/* Closed to arrival/departure */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editValues.closedToArrival}
                        onChange={(e) => setEditValues((v) => ({ ...v, closedToArrival: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                      />
                      <span className="text-xs text-slate-600">Đóng cửa đến <span className="text-slate-400">(không nhận khách ngày này)</span></span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editValues.closedToDeparture}
                        onChange={(e) => setEditValues((v) => ({ ...v, closedToDeparture: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                      />
                      <span className="text-xs text-slate-600">Đóng cửa đi <span className="text-slate-400">(không trả phòng ngày này)</span></span>
                    </label>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Ghi chú nội bộ</label>
                    <input
                      type="text"
                      value={editValues.note}
                      onChange={(e) => setEditValues((v) => ({ ...v, note: e.target.value }))}
                      placeholder="VD: Cuối tuần, lễ..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={handleApply}
                      disabled={saving}
                      className="w-full rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                    >
                      {saving ? "Đang lưu…" : "Áp dụng"}
                    </button>
                    <button
                      onClick={handleClearRates}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <IconRotate size={13} />
                      Xoá thiết lập ngày này
                    </button>
                  </div>

                  {/* Block / Unblock */}
                  <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={handleBlock}
                      disabled={saving}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                    >
                      <IconLock size={12} />
                      Đóng cửa
                    </button>
                    <button
                      onClick={handleUnblock}
                      disabled={saving}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-teal-200 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-60"
                    >
                      <IconUnlock size={12} />
                      Mở cửa
                    </button>
                  </div>

                  {saveMsg && (
                    <p className={`text-center text-xs font-medium ${saveMsg.includes("Lỗi") ? "text-rose-600" : "text-teal-600"}`}>
                      {saveMsg}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Quick guide */}
            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 leading-5">
              <p className="font-medium text-slate-600 mb-1">Cách dùng</p>
              <p>• Nhấp vào ngày để chọn đơn lẻ</p>
              <p>• Kéo để chọn nhiều ngày liên tiếp</p>
              <p>• Giá riêng (amber) ghi đè giá cơ bản cho đêm đó</p>
              <p>• Tối thiểu/tối đa áp dụng cho khách check-in ngày đó</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
