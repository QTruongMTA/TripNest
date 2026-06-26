"use client";

import { useState } from "react";

type SearchToolbarProps = {
  values: {
    city?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  };
};

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return toLocalIsoDate(date);
}

export function SearchToolbar({ values }: SearchToolbarProps) {
  const today = toLocalIsoDate(new Date());
  const [checkIn, setCheckIn] = useState(values.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(values.checkOut ?? "");
  const datesStarted = Boolean(checkIn || checkOut);

  return (
    <form className="grid overflow-hidden rounded-2xl border-2 border-amber-400 bg-amber-400 shadow-[0_14px_40px_rgba(15,118,110,0.10)] md:grid-cols-[1.25fr_0.9fr_0.9fr_0.72fr_auto]">
      <label className="grid min-w-0 gap-1 border-b border-amber-300 bg-white px-4 py-2.5 md:border-b-0 md:border-r">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">Điểm đến</span>
        <input name="city" defaultValue={values.city} placeholder="Bạn muốn đi đâu?" className="min-w-0 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400" />
      </label>
      <label className="grid gap-1 border-b border-amber-300 bg-white px-4 py-2.5 md:border-b-0 md:border-r">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">Nhận phòng</span>
        <input
          name="checkIn"
          type="date"
          min={today}
          value={checkIn}
          required={datesStarted}
          onChange={(event) => {
            const value = event.target.value;
            setCheckIn(value);
            if (checkOut && checkOut <= value) setCheckOut("");
          }}
          className="min-w-0 bg-transparent text-sm font-medium text-slate-950 outline-none"
        />
      </label>
      <label className="grid gap-1 border-b border-amber-300 bg-white px-4 py-2.5 md:border-b-0 md:border-r">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">Trả phòng</span>
        <input
          name="checkOut"
          type="date"
          min={checkIn ? nextDate(checkIn) : today}
          value={checkOut}
          required={datesStarted}
          onChange={(event) => setCheckOut(event.target.value)}
          className="min-w-0 bg-transparent text-sm font-medium text-slate-950 outline-none"
        />
      </label>
      <label className="grid gap-1 border-b border-amber-300 bg-white px-4 py-2.5 md:border-b-0 md:border-r">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">Khách</span>
        <input name="guests" type="number" min="1" max="100" required defaultValue={values.guests ?? "2"} className="min-w-0 bg-transparent text-sm font-medium text-slate-950 outline-none" />
      </label>
      <button className="m-1.5 rounded-xl bg-teal-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-950 focus:outline-none focus:ring-2 focus:ring-white">
        Tìm kiếm
      </button>
    </form>
  );
}
