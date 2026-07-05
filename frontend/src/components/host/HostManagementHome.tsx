"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type HostProperty = {
  id: string;
  code: string;
  title: string;
  address: string;
  city: string;
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
};

type HostBooking = {
  id: string;
  status: string;
  paymentStatus: string;
  checkIn: string | null;
  checkOut: string | null;
  numGuests: number;
  totalPrice: number;
  notes: string | null;
  createdAt: string;
  guest: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  property: {
    id: string;
    title: string;
    city: string;
    country: string;
    thumbnailUrl: string | null;
  } | null;
};

const metricCards = [
  { key: "bookings", label: "Đặt phòng", icon: ListIcon },
  { key: "arrivals", label: "Khách đến", icon: LoginIcon },
  { key: "departures", label: "Khách đi", icon: LogoutIcon },
  { key: "reviews", label: "Đánh giá", icon: StarIcon },
  { key: "cancellations", label: "Lượt hủy", icon: XIcon },
] as const;

type MetricKey = (typeof metricCards)[number]["key"];

const bookingDetailMetrics = new Set<MetricKey>(["bookings", "arrivals", "departures", "cancellations"]);

const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "PENDING", label: "Đang chờ duyệt" },
  { value: "INACTIVE", label: "Từ chối" },
  { value: "SUSPENDED", label: "Đã khóa" },
];

const statusLabel: Record<HostProperty["status"], string> = {
  ACTIVE: "Đang hoạt động",
  PENDING: "Đang chờ duyệt",
  INACTIVE: "Từ chối",
  SUSPENDED: "Đã khóa",
};

const statusDot: Record<HostProperty["status"], string> = {
  ACTIVE: "bg-emerald-500",
  PENDING: "bg-amber-500",
  INACTIVE: "bg-slate-400",
  SUSPENDED: "bg-rose-500",
};

const bookingStatusLabel: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn thành",
};

const bookingStatusClass: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
  COMPLETED: "bg-slate-100 text-slate-700 ring-slate-200",
};

const typeLabel: Record<string, string> = {
  HOUSE: "Nhà riêng",
  APARTMENT: "Căn hộ",
  VILLA: "Biệt thự",
  HOMESTAY: "Homestay",
  HOTEL: "Khách sạn",
  RESORT: "Resort",
  UNIQUE: "Chỗ nghỉ độc đáo",
};

export function HostManagementHome() {
  const [properties, setProperties] = useState<HostProperty[]>([]);
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("bookings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      setError("Vui lòng đăng nhập để xem danh sách chỗ nghỉ.");
      return;
    }

    Promise.all([
      api.get("/host/properties", { headers: { Authorization: `Bearer ${token}` } }),
      api.get("/host/bookings", { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(([propertiesResponse, bookingsResponse]) => {
        setProperties(propertiesResponse.data.data ?? []);
        setBookings(bookingsResponse.data.data ?? []);
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? "Không thể tải danh sách chỗ nghỉ."))
      .finally(() => setLoading(false));
  }, []);

  const filteredProperties = properties.filter((property) => {
    const matchesLocation = location === "all" || property.city === location;
    const matchesStatus = status === "all" || property.status === status;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      property.code.toLowerCase().includes(normalizedQuery) ||
      property.title.toLowerCase().includes(normalizedQuery) ||
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

  const cities = useMemo(() => Array.from(new Set(properties.map((property) => property.city))), [properties]);
  const averageOccupancy = filteredProperties.length ? Math.round(totals.occupancy / filteredProperties.length) : 0;
  const visiblePropertyIds = useMemo(
    () => new Set(filteredProperties.map((property) => property.id)),
    [filteredProperties]
  );
  const metricBookings = useMemo(
    () => filterBookingsByMetric(bookings, selectedMetric, visiblePropertyIds),
    [bookings, selectedMetric, visiblePropertyIds]
  );
  const selectedMetricLabel = metricCards.find((metric) => metric.key === selectedMetric)?.label ?? "Đặt phòng";

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Host workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Chỗ nghỉ của Quý vị</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Theo dõi toàn bộ chỗ nghỉ đã đăng, trạng thái xét duyệt và hiệu suất vận hành trong một giao diện chung.
          </p>
        </div>
        <a href="/host/properties/new" className="rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-teal-900/20 transition hover:bg-teal-800">
          Thêm chỗ nghỉ mới
        </a>
      </div>

      {error ? <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

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
                placeholder="Lọc theo ID, tên, địa chỉ"
                className="h-11 w-72 rounded-md border border-slate-300 bg-white pl-3 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              />
              <SearchIcon />
            </label>
          </div>
        </div>
      </div>

      <section className="mt-7">
        <h2 className="text-xl font-semibold text-slate-950">Tổng quan hôm nay</h2>
        <div className="mt-4 grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-teal-950/5 sm:grid-cols-2 lg:grid-cols-5">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            const active = metric.key === selectedMetric;
            const hasBookingDetails = bookingDetailMetrics.has(metric.key);
            return (
              <button
                key={metric.key}
                type="button"
                onClick={() => setSelectedMetric(metric.key)}
                className={`border-b border-slate-200 p-5 text-left transition last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0 ${
                  active
                    ? "bg-teal-50 ring-2 ring-inset ring-teal-600"
                    : "bg-white hover:bg-slate-50"
                } ${hasBookingDetails ? "cursor-pointer" : "cursor-default"}`}
              >
                <Icon />
                <p className="mt-5 text-2xl font-semibold text-slate-950">{totals[metric.key as MetricKey]}</p>
                <p className="mt-2 text-sm font-medium text-teal-700">{metric.label}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-teal-950/5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Chi tiết {selectedMetricLabel.toLowerCase()}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Hiển thị chỗ ở đã được đặt, thông tin khách, ngày lưu trú và số người.
            </p>
          </div>
          <a href="/host/bookings" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-600 hover:text-teal-700">
            Xem tất cả đơn
          </a>
        </div>

        {!bookingDetailMetrics.has(selectedMetric) ? (
          <div className="px-5 py-8 text-sm text-slate-500">
            Card này chưa có danh sách đơn đặt phòng tương ứng.
          </div>
        ) : metricBookings.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {metricBookings.map((booking) => (
              <BookingDetailRow key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-sm text-slate-500">
            Chưa có đơn nào khớp với card đang chọn.
          </div>
        )}
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <InsightCard label="Doanh thu tháng này" value={`${totals.revenue.toLocaleString("vi-VN")} ₫`} hint="Tổng doanh thu theo các chỗ nghỉ đang lọc" />
        <InsightCard label="Công suất trung bình" value={`${averageOccupancy}%`} hint="Tỷ lệ đêm đã bán trên lịch mở bán" />
        <InsightCard label="Chỗ nghỉ đang mở" value={String(filteredProperties.filter((property) => property.status === "ACTIVE").length)} hint="Đã được duyệt và có thể nhận đặt phòng" />
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
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-teal-950/5">
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 font-semibold">Chỗ nghỉ</th>
                  <th className="px-4 py-4 font-semibold">Trạng thái</th>
                  <th className="px-4 py-4 font-semibold">Loại</th>
                  <th className="px-4 py-4 font-semibold text-right">Giá/đêm</th>
                  <th className="px-4 py-4 font-semibold text-right">Sức chứa</th>
                  <th className="px-4 py-4 font-semibold text-right">Đến 48h tới</th>
                  <th className="px-4 py-4 font-semibold text-right">Rời 48h tới</th>
                  <th className="px-4 py-4 font-semibold text-right">Đặt phòng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">Đang tải danh sách chỗ nghỉ...</td></tr>
                ) : null}
                {!loading && filteredProperties.map((property) => (
                  <PropertyRow key={property.id} property={property} />
                ))}
                {!loading && filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      Chưa có chỗ nghỉ phù hợp. Nếu Quý vị vừa gửi cơ sở mới, cơ sở sẽ hiển thị tại đây với trạng thái đang chờ duyệt.
                    </td>
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

function filterBookingsByMetric(bookings: HostBooking[], metric: MetricKey, visiblePropertyIds: Set<string>) {
  const now = new Date();
  const upcomingWindowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  return bookings.filter((booking) => {
    if (booking.property?.id && !visiblePropertyIds.has(booking.property.id)) return false;
    if (metric === "bookings") return true;
    if (metric === "cancellations") return booking.status === "CANCELLED";
    if (metric === "arrivals") return isWithinWindow(booking.checkIn, now, upcomingWindowEnd);
    if (metric === "departures") return isWithinWindow(booking.checkOut, now, upcomingWindowEnd);
    return false;
  });
}

function isWithinWindow(value: string | null, start: Date, end: Date) {
  if (!value) return false;
  const date = new Date(value);
  return date >= start && date <= end;
}

function formatDate(value: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function BookingDetailRow({ booking }: { booking: HostBooking }) {
  return (
    <article className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(220px,1.4fr)_minmax(180px,1fr)_1fr_auto] md:items-center">
      <div className="flex min-w-0 gap-3">
        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
          {booking.property?.thumbnailUrl ? (
            <Image
              src={booking.property.thumbnailUrl}
              alt={booking.property.title}
              fill
              unoptimized
              sizes="80px"
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{booking.property?.title ?? "Chỗ nghỉ không còn tồn tại"}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-teal-700">{booking.property?.city ?? "Không rõ vị trí"}</p>
          <p className="mt-1 text-xs text-slate-400">Mã đơn: {booking.id.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900">{booking.guest.name || "Khách TripNest"}</p>
        <p className="mt-1 break-all text-xs text-slate-500">{booking.guest.email}</p>
        {booking.guest.phone ? <p className="mt-1 text-xs text-slate-500">{booking.guest.phone}</p> : null}
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-400">Nhận</p>
          <p className="mt-1 font-medium text-slate-800">{formatDate(booking.checkIn)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Trả</p>
          <p className="mt-1 font-medium text-slate-800">{formatDate(booking.checkOut)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Số khách</p>
          <p className="mt-1 font-medium text-slate-800">{booking.numGuests}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${bookingStatusClass[booking.status] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
          {bookingStatusLabel[booking.status] ?? booking.status}
        </span>
        <span className="text-sm font-semibold text-slate-950">
          {booking.totalPrice.toLocaleString("vi-VN")} ₫
        </span>
      </div>
    </article>
  );
}

function PropertyRow({ property }: { property: HostProperty }) {
  const router = useRouter();
  const href = `/host/properties/${property.id}`;

  function openProperty() {
    router.push(href);
  }

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={openProperty}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProperty();
        }
      }}
      className="group cursor-pointer align-top transition hover:bg-teal-50/60 focus-within:bg-teal-50/60"
    >
      <td className="px-4 py-4">
        <div className="flex gap-3">
          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
            {property.thumbnailUrl ? (
              <Image
                src={property.thumbnailUrl}
                alt={property.title}
                fill
                unoptimized
                sizes="80px"
                className="object-cover"
              />
            ) : null}
          </div>
          <div>
            <p className="font-semibold text-blue-700 underline-offset-2 group-hover:underline">{property.title}</p>
            <p className="mt-1 text-xs text-slate-400">{property.code}</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{property.address}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex items-center gap-2 text-sm text-slate-700">
          <span className={`h-2.5 w-2.5 rounded-full ${statusDot[property.status]}`} />
          {statusLabel[property.status]}
        </span>
      </td>
      <td className="px-4 py-4 text-slate-600">{typeLabel[property.type] ?? property.type}</td>
      <td className="px-4 py-4 text-right font-medium">{property.pricePerNight.toLocaleString("vi-VN")} ₫</td>
      <td className="px-4 py-4 text-right tabular-nums">{property.maxGuests} khách</td>
      <td className="px-4 py-4 text-right tabular-nums">{property.arrivals}</td>
      <td className="px-4 py-4 text-right tabular-nums">{property.departures}</td>
      <td className="px-4 py-4 text-right tabular-nums">{property.bookings}</td>
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
