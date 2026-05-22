"use client";

import { useState } from "react";

export function HeroSection() {
  const today = new Date().toISOString().split("T")[0];
  const [checkIn, setCheckIn] = useState("");

  return (
    <section className="relative overflow-visible bg-teal-900 pt-28 text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,_#115e59_0%,_#0f766e_100%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-24 md:px-6 md:pb-28">
        <div className="max-w-3xl pt-4">
          <div className="animate-fade-up mb-5 flex flex-wrap gap-2 text-sm">
            {["Miễn phí hủy", "Xác nhận tức thì", "Hơn 2.000 chỗ nghỉ"].map((item) => (
              <span key={item} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white/90 backdrop-blur">
                {item}
              </span>
            ))}
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-tight md:text-5xl">Tìm chỗ nghỉ tiếp theo</h1>
          <p className="animate-fade-up animate-delay-1 mt-3 max-w-2xl text-base leading-7 text-white/90">
            Tìm ưu đãi khách sạn, căn hộ và resort tại các điểm đến nổi bật khắp Việt Nam.
          </p>
        </div>

        <form action="/properties" className="animate-fade-up animate-delay-2 absolute inset-x-5 -bottom-8 grid gap-1 rounded-md bg-amber-400 p-1 shadow-xl shadow-slate-950/10 md:inset-x-6 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto]">
          <label className="rounded-sm bg-white px-4 py-3 text-left transition hover:bg-teal-50">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Địa điểm</span>
            <input name="city" placeholder="Bạn muốn đi đâu?" className="mt-1 block w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400" />
          </label>
          <label className="rounded-sm bg-white px-4 py-3 text-left transition hover:bg-teal-50">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ngày đến</span>
            <input
              name="checkIn"
              type="date"
              min={today}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="mt-1 block w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
            />
          </label>
          <label className="rounded-sm bg-white px-4 py-3 text-left transition hover:bg-teal-50">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ngày đi</span>
            <input
              name="checkOut"
              type="date"
              min={checkIn || today}
              className="mt-1 block w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
            />
          </label>
          <label className="rounded-sm bg-white px-4 py-3 text-left transition hover:bg-teal-50">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Khách</span>
            <input name="guests" type="number" min={1} placeholder="2" className="mt-1 block w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400" />
          </label>
          <button type="submit" className="rounded-sm bg-teal-800 px-7 py-4 text-sm font-semibold text-white transition hover:bg-teal-950 active:scale-[0.99]">Tìm kiếm</button>
        </form>
      </div>
    </section>
  );
}
