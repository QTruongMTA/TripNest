"use client";

import { generatePropertyId, getStatusClass, getStatusLabel, hostProperties, type HostProperty } from "@/components/host/host-dashboard-data";
import { useMemo, useState } from "react";

const metricCards = [
  { key: "bookings", label: "Đặt phòng", icon: ListIcon },
  { key: "arrivals", label: "Khách đến", icon: LoginIcon },
  { key: "departures", label: "Khách đi", icon: LogoutIcon },
  { key: "reviews", label: "Đánh giá", icon: StarIcon },
  { key: "cancellations", label: "Lượt hủy", icon: XIcon },
] as const;

type MetricKey = (typeof metricCards)[number]["key"];

export function HostManagementHome() {
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const properties = useMemo(() => {
    return hostProperties.map((property) => ({
      ...property,
      id: property.id || generatePropertyId(property.name),
    }));
  }, []);

  const filteredProperties = properties.filter((property) => {
    const matchesLocation = location === "all" || property.city === location;
    const matchesStatus = status === "all" || property.status === status;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      property.id.includes(normalizedQuery) ||
      property.name.toLowerCase().includes(normalizedQuery) ||
      property.address.toLowerCase().includes(normalizedQuery);

    return matchesLocation && matchesStatus && matchesQuery;
  });

  const totals = filteredProperties.reduce(
    (summary, property) => ({
      bookings: summary.bookings + property.bookings,
      arrivals: summary.arrivals + property.arrivals,
      departures: summary.departures + property.departures,
      reviews: summary.reviews + property.reviews,
      cancellations: summary.cancellations + property.cancellations,
      revenue: summary.revenue + property.revenue,
      occupancy: summary.occupancy + property.occupancy,
    }),
    { bookings: 0, arrivals: 0, departures: 0, reviews: 0, cancellations: 0, revenue: 0, occupancy: 0 }
  );

  const cities = Array.from(new Set(properties.map((property) => property.city)));
  const averageOccupancy = filteredProperties.length ? Math.round(totals.occupancy / filteredProperties.length) : 0;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Host workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Chỗ nghỉ của Quý vị</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Quản lý toàn bộ chỗ nghỉ, trạng thái đặt phòng và hiệu suất vận hành trong một giao diện chung.
          </p>
        </div>
        <a href="/host/properties/new" className="rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-teal-900/20 transition hover:bg-teal-800">
          Thêm chỗ nghỉ mới
        </a>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="location-filter" className="text-sm font-semibold text-slate-800">Lọc theo vị trí</label>
          <div className="mt-2 flex flex-wrap gap-3">
            <select
              id="location-filter"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="h-11 min-w-56 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            >
              <option value="all">Tất cả chỗ nghỉ</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <label className="relative block">
              <span className="sr-only">Lọc theo ID chỗ nghỉ hoặc tên</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Lọc theo ID chỗ nghỉ, tên"
                className="h-11 w-72 rounded-md border border-slate-300 bg-white pl-3 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              />
              <SearchIcon />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-7 border-b border-slate-200">
        <div className="flex gap-7 text-sm">
          <button type="button" className="border-b-2 border-teal-700 px-1 pb-3 font-semibold text-teal-700">Hoạt động</button>
          <button type="button" className="px-1 pb-3 text-slate-600 hover:text-slate-950">Hiệu suất</button>
          <button type="button" className="px-1 pb-3 text-slate-600 hover:text-slate-950">Cài đặt</button>
        </div>
      </div>

      <section className="mt-5">
        <h2 className="text-xl font-semibold text-slate-950">Tổng quan hôm nay</h2>
        <div className="mt-4 grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-teal-950/5 sm:grid-cols-2 lg:grid-cols-5">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <article key={metric.key} className="border-b border-slate-200 p-5 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0">
                <Icon />
                <p className="mt-5 text-2xl font-semibold text-slate-950">{totals[metric.key as MetricKey]}</p>
                <p className="mt-2 text-sm font-medium text-teal-700">{metric.label}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <InsightCard label="Doanh thu tháng này" value={`${totals.revenue.toLocaleString("vi-VN")} ₫`} hint="Tổng doanh thu theo các chỗ nghỉ đang lọc" />
        <InsightCard label="Công suất trung bình" value={`${averageOccupancy}%`} hint="Tỷ lệ đêm đã bán trên lịch mở bán" />
        <InsightCard label="Chỗ nghỉ đang mở" value={String(filteredProperties.filter((property) => property.status === "open").length)} hint="Sẵn sàng nhận đặt phòng từ khách" />
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-800">
            Lọc theo trạng thái
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 min-w-56 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="open">Mở / Có thể đặt phòng</option>
              <option value="review">Đang chờ duyệt</option>
              <option value="paused">Tạm dừng nhận đặt phòng</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <button type="button" className="hover:text-teal-700">Tải xuống</button>
            <button type="button" className="hover:text-teal-700">Tùy chỉnh dữ liệu</button>
            <button type="button" className="hover:text-teal-700">Tùy chỉnh chế độ xem</button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-teal-950/5">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 font-semibold">ID</th>
                  <th className="px-4 py-4 font-semibold">Chỗ nghỉ</th>
                  <th className="px-4 py-4 font-semibold">Trạng thái trên TripNest</th>
                  <th className="px-4 py-4 font-semibold text-right">Đến trong 48 giờ tới</th>
                  <th className="px-4 py-4 font-semibold text-right">Rời đi trong 48 giờ tới</th>
                  <th className="px-4 py-4 font-semibold text-right">Tin nhắn từ khách</th>
                  <th className="px-4 py-4 font-semibold text-right">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProperties.map((property) => (
                  <PropertyRow key={property.id} property={property} />
                ))}
                {filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">Không tìm thấy chỗ nghỉ phù hợp với bộ lọc.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  );
}

function PropertyRow({ property }: { property: HostProperty }) {
  return (
    <tr className="align-top hover:bg-teal-50/40">
      <td className="px-4 py-4 font-medium text-slate-700">{property.id}</td>
      <td className="px-4 py-4">
        <p className="font-semibold text-slate-950">{property.name}</p>
        <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{property.address}</p>
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex items-center gap-2 text-sm text-slate-700">
          <span className={`h-2.5 w-2.5 rounded-full ${getStatusClass(property.status)}`} />
          {getStatusLabel(property.status)}
        </span>
      </td>
      <td className="px-4 py-4 text-right tabular-nums">{property.arrivals}</td>
      <td className="px-4 py-4 text-right tabular-nums">{property.departures}</td>
      <td className="px-4 py-4 text-right tabular-nums">{property.bookings}</td>
      <td className="px-4 py-4 text-right tabular-nums">{property.reviews}</td>
    </tr>
  );
}

function InsightCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-teal-950/5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p>
    </article>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" strokeLinecap="round" />
    </svg>
  );
}
