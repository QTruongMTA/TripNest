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

export function SearchToolbar({ values }: SearchToolbarProps) {
  const today = new Date().toISOString().split("T")[0];
  const [checkIn, setCheckIn] = useState(values.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(values.checkOut ?? "");

  return (
    <form className="grid gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto]">
      <input name="city" defaultValue={values.city} placeholder="Bạn muốn đi đâu?" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input
        name="checkIn"
        type="date"
        min={today}
        value={checkIn}
        onChange={(e) => {
          const val = e.target.value;
          setCheckIn(val);
          if (checkOut && checkOut <= val) setCheckOut("");
        }}
        className="rounded-2xl border border-slate-200 px-4 py-3"
      />
      <input
        name="checkOut"
        type="date"
        min={checkIn || today}
        value={checkOut}
        onChange={(e) => setCheckOut(e.target.value)}
        className="rounded-2xl border border-slate-200 px-4 py-3"
      />
      <input name="guests" type="number" min="1" defaultValue={values.guests} placeholder="Số khách" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <button className="rounded-2xl bg-teal-800 px-5 py-3 font-semibold text-white transition hover:bg-teal-950">Tìm kiếm</button>
    </form>
  );
}
