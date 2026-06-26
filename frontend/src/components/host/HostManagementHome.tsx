"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Image from "next/image";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

type HostProperty = {
  id: string;
  code: string;
  title: string;
  address: string;
  city: string;
  country: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
  type: string;
  pricePerNight: number;
  maxGuests: number;
  bedroomCount: number;
  bathrooms: number;
  thumbnailUrl?: string | null;
  bookings: number;
  arrivals: number;
  departures: number;
  reviews: number;
  cancellations: number;
  revenue: number;
  occupancy: number;
  createdAt: string;
};

const STATUS_LABEL: Record<HostProperty["status"], string> = {
  ACTIVE: "Đang hoạt động",
  PENDING: "Chờ duyệt",
  INACTIVE: "Tạm ẩn",
  SUSPENDED: "Đã khóa",
};

const STATUS_CHIP: Record<HostProperty["status"], string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  INACTIVE: "bg-slate-100 text-slate-500",
  SUSPENDED: "bg-rose-100 text-rose-700",
};

const TYPE_LABEL: Record<string, string> = {
  HOUSE: "Nhà riêng",
  APARTMENT: "Căn hộ",
  VILLA: "Biệt thự",
  HOMESTAY: "Homestay",
  HOTEL: "Khách sạn",
  HOSTEL: "Hostel",
  RESORT: "Resort",
  CABIN: "Cabin / Nhà gỗ",
  BUNGALOW: "Bungalow",
  TREEHOUSE: "Nhà trên cây",
  HOUSEBOAT: "Nhà thuyền",
  UNIQUE: "Độc đáo",
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "INACTIVE", label: "Tạm ẩn" },
  { value: "SUSPENDED", label: "Đã khóa" },
];

export function HostManagementHome() {
  const [properties, setProperties] = useState<HostProperty[]>([]);
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      setError("Vui lòng đăng nhập để xem danh sách chỗ nghỉ.");
      return;
    }

    api
      .get("/host/properties", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => setProperties(response.data.data ?? []))
      .catch((err) => setError(err.response?.data?.error?.message ?? "Không thể tải danh sách chỗ nghỉ."))
      .finally(() => setLoading(false));
  }, []);

  function handleStatusChange(id: string, newStatus: HostProperty["status"]) {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
  }

  const cities = useMemo(() => Array.from(new Set(properties.map((p) => p.city))), [properties]);

  const filtered = properties.filter((p) => {
    if (cityFilter !== "all" && p.city !== cityFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q) && !p.address.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totals = filtered.reduce(
    (acc, p) => ({
      bookings: acc.bookings + p.bookings,
      arrivals: acc.arrivals + p.arrivals,
      departures: acc.departures + p.departures,
      active: acc.active + (p.status === "ACTIVE" ? 1 : 0),
    }),
    { bookings: 0, arrivals: 0, departures: 0, active: 0 }
  );

  return (
    <section>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Host workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Chỗ nghỉ của tôi</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Quản lý chỗ nghỉ, chỉnh sửa thông tin và kiểm soát lịch đặt phòng từ một nơi.
          </p>
        </div>
        <a
          href="/host/properties/new"
          className="rounded-full bg-teal-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          + Thêm chỗ nghỉ mới
        </a>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* Summary strip */}
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Tổng chỗ nghỉ" value={filtered.length} />
        <SummaryTile label="Đang hoạt động" value={totals.active} accent />
        <SummaryTile label="Khách đến 48h tới" value={totals.arrivals} />
        <SummaryTile label="Tổng đặt phòng" value={totals.bookings} />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        >
          <option value="all">Tất cả thành phố</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        >
          {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, địa chỉ…"
            className="h-10 w-64 rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm outline-none placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Property cards */}
      <div className="mt-6 space-y-4">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-700" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 py-16 text-center text-slate-400">
            {properties.length === 0
              ? "Chưa có chỗ nghỉ nào. Nhấn \"+ Thêm chỗ nghỉ mới\" để bắt đầu."
              : "Không có chỗ nghỉ nào khớp với bộ lọc hiện tại."}
          </div>
        )}

        {filtered.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </section>
  );
}

function PropertyCard({
  property,
  onStatusChange,
}: {
  property: HostProperty;
  onStatusChange: (id: string, status: HostProperty["status"]) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const canToggle = property.status === "ACTIVE" || property.status === "INACTIVE";

  async function handleToggle() {
    const token = getAccessToken();
    if (!token || !canToggle) return;
    setToggling(true);
    setToggleError(null);
    try {
      const res = await fetch(`${API_BASE}/host/properties/${property.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message ?? "Thao tác thất bại");
      onStatusChange(property.id, payload.data.status);
    } catch (e) {
      setToggleError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally {
      setToggling(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="grid sm:grid-cols-[200px_1fr]">
        {/* Thumbnail */}
        <div className="relative min-h-[160px] bg-slate-100">
          {property.thumbnailUrl ? (
            <Image
              src={property.thumbnailUrl}
              alt={property.title}
              fill
              unoptimized
              sizes="200px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[160px] items-center justify-center text-slate-300">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">{property.code}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[property.status]}`}>
                  {STATUS_LABEL[property.status]}
                </span>
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{property.title}</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {TYPE_LABEL[property.type] ?? property.type} · {property.city}, {property.country}
              </p>
            </div>
            <p className="shrink-0 text-right">
              <span className="text-xl font-semibold text-teal-800">
                {property.pricePerNight.toLocaleString("vi-VN")} ₫
              </span>
              <span className="text-sm text-slate-400"> /đêm</span>
            </p>
          </div>

          {/* Stats row */}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
            <span>{property.maxGuests} khách tối đa</span>
            <span>{property.bedroomCount} phòng ngủ</span>
            <span>{property.bathrooms} phòng tắm</span>
            {property.arrivals > 0 && (
              <span className="font-medium text-amber-600">{property.arrivals} khách đến trong 48h</span>
            )}
            {property.bookings > 0 && (
              <span>{property.bookings} booking</span>
            )}
          </div>

          {toggleError && (
            <p className="mt-2 text-xs text-rose-600">{toggleError}</p>
          )}

          {/* Action buttons */}
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <a
              href={`/host/properties/${property.id}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Chỉnh sửa
            </a>
            <a
              href={`/host/properties/${property.id}?tab=availability`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Xem lịch
            </a>
            {canToggle && (
              <button
                type="button"
                onClick={handleToggle}
                disabled={toggling}
                className={`rounded-full px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50
                  ${property.status === "ACTIVE"
                    ? "bg-slate-500 hover:bg-slate-600"
                    : "bg-emerald-600 hover:bg-emerald-700"
                  }
                `}
              >
                {toggling ? "…" : property.status === "ACTIVE" ? "Tạm ẩn" : "Kích hoạt"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function SummaryTile({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-bold tabular-nums ${accent ? "text-teal-700" : "text-slate-900"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
