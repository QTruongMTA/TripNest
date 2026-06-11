"use client";

import { useEffect, useMemo, useState } from "react";
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
  hostApprovalStatus?: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | null;
  hostApprovalReviewedAt?: string | null;
  hostApprovalNotes?: string | null;
  latestRevisionRequest?: {
    createdAt: string;
    notes?: string | null;
    requestedItems: string[];
  } | null;
  latestFieldInspection?: {
    status: string;
    reportResult?: string | null;
    reportNotes?: string | null;
    dueDate?: string | null;
    createdAt: string;
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

const typeLabel: Record<string, string> = {
  HOUSE: "Nhà riêng",
  APARTMENT: "Căn hộ",
  VILLA: "Biệt thự",
  HOMESTAY: "Homestay",
  HOTEL: "Khách sạn",
  RESORT: "Resort",
  UNIQUE: "Chỗ nghỉ độc đáo",
};

const hostApprovalLabel: Record<NonNullable<HostProperty["hostApprovalStatus"]>, string> = {
  PENDING: "Hồ sơ host chờ duyệt",
  UNDER_REVIEW: "Hồ sơ host đang xem xét",
  APPROVED: "Hồ sơ host đã duyệt",
  REJECTED: "Hồ sơ host bị từ chối",
};

const revisionItemLabel: Record<string, string> = {
  addressInProvince: "Địa chỉ/map pin",
  photosMatch: "Ảnh xác minh",
  basicInfoComplete: "Thông tin niêm yết",
  legalInfoReviewed: "Hồ sơ host/pháp lý",
  noPolicyViolation: "Xác minh rủi ro/chính sách",
  hostProfile: "Hoàn thiện hồ sơ host/pháp lý",
};

const fieldInspectionStatusLabel: Record<string, string> = {
  PENDING: "TripNest đã lên lịch xác minh trực tiếp",
  IN_PROGRESS: "TripNest đang xác minh trực tiếp",
  COMPLETED: "TripNest đã hoàn tất xác minh trực tiếp",
  CANCELLED: "Yêu cầu xác minh trực tiếp đã hủy",
};

export function HostManagementHome() {
  const [properties, setProperties] = useState<HostProperty[]>([]);
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState("all");
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
    { bookings: 0, arrivals: 0, departures: 0, reviews: 0, cancellations: 0, revenue: 0, occupancy: 0 },
  );

  const cities = useMemo(() => Array.from(new Set(properties.map((property) => property.city))), [properties]);
  const averageOccupancy = filteredProperties.length ? Math.round(totals.occupancy / filteredProperties.length) : 0;
  const pendingRevisionCount = filteredProperties.filter((property) => property.status === "PENDING" && property.latestRevisionRequest).length;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Host workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Chỗ nghỉ của Quý vị</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Theo dõi toàn bộ chỗ nghỉ đã đăng, trạng thái xét duyệt và các mục TripNest đang chờ Quý vị bổ sung trong một giao diện chung.
          </p>
        </div>
        <a href="/host/properties/new" className="rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-teal-900/20 transition hover:bg-teal-800">
          Thêm chỗ nghỉ mới
        </a>
      </div>

      {error ? <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {pendingRevisionCount > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <div>
            <p className="font-semibold">TripNest đang chờ Quý vị bổ sung thông tin cho {pendingRevisionCount} cơ sở.</p>
            <p className="mt-1">Mở trang hồ sơ host để cập nhật thông tin pháp lý và liên hệ trước khi gửi lại duyệt.</p>
          </div>
          <a href="/host/profile" className="rounded-md border border-amber-300 bg-white px-4 py-2 font-semibold text-amber-900 transition hover:bg-amber-100">
            Bổ sung hồ sơ
          </a>
        </div>
      ) : null}

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

function PropertyRow({ property }: { property: HostProperty }) {
  const latestRevision = property.latestRevisionRequest;
  const latestFieldInspection = property.latestFieldInspection;
  const revisionItemsText = latestRevision?.requestedItems.length
    ? latestRevision.requestedItems.map((item) => revisionItemLabel[item] ?? item).join(", ")
    : null;
  const needsHostProfileUpdate = latestRevision?.requestedItems.some((item) => item === "hostProfile" || item === "legalInfoReviewed");
  const hostApprovalText = property.hostApprovalStatus ? hostApprovalLabel[property.hostApprovalStatus] : null;

  return (
    <tr className="align-top hover:bg-teal-50/40">
      <td className="px-4 py-4">
        <div className="flex gap-3">
          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
            {property.thumbnailUrl ? <img src={property.thumbnailUrl} alt={property.title} className="h-full w-full object-cover" /> : null}
          </div>
          <div>
            <p className="font-semibold text-slate-950">{property.title}</p>
            <p className="mt-1 text-xs text-slate-400">{property.code}</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{property.address}</p>
            {property.status === "PENDING" ? (
              <div className="mt-2 max-w-md rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                <p className="font-semibold">
                  {latestRevision ? "TripNest đang chờ Quý vị bổ sung thông tin" : "TripNest đang xem xét cơ sở"}
                </p>
                {hostApprovalText ? (
                  <p className="mt-1">
                    {hostApprovalText}
                    {property.hostApprovalReviewedAt ? ` • ${new Date(property.hostApprovalReviewedAt).toLocaleDateString("vi-VN")}` : ""}
                  </p>
                ) : null}
                {latestRevision ? (
                  <>
                    {revisionItemsText ? <p className="mt-1">Cần bổ sung: {revisionItemsText}.</p> : null}
                    {latestRevision.notes ? <p className="mt-1">{latestRevision.notes}</p> : null}
                    {needsHostProfileUpdate ? (
                      <div className="mt-3">
                        <a href="/host/profile" className="inline-flex rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100">
                          Bổ sung hồ sơ host
                        </a>
                      </div>
                    ) : null}
                  </>
                ) : latestFieldInspection ? (
                  <>
                    <p className="mt-1">{fieldInspectionStatusLabel[latestFieldInspection.status] ?? latestFieldInspection.status}.</p>
                    {latestFieldInspection.dueDate ? <p className="mt-1">Dự kiến hoàn tất trước {new Date(latestFieldInspection.dueDate).toLocaleDateString("vi-VN")}.</p> : null}
                    {latestFieldInspection.reportResult ? <p className="mt-1">Kết quả: {latestFieldInspection.reportResult}.</p> : null}
                    {latestFieldInspection.reportNotes ? <p className="mt-1">{latestFieldInspection.reportNotes}</p> : null}
                  </>
                ) : (
                  <p className="mt-1">Sau khi đủ căn cứ xác minh, TripNest sẽ mở bán cơ sở cho khách đặt.</p>
                )}
              </div>
            ) : null}
            {property.status === "INACTIVE" && property.hostApprovalNotes ? (
              <div className="mt-2 max-w-md rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">
                <p className="font-semibold">Lưu ý từ TripNest</p>
                <p className="mt-1">{property.hostApprovalNotes}</p>
              </div>
            ) : null}
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
      <path d="m12 3 2.7 5.48 6.05.88-4.38 4.27 1.03 6.02L12 16.8l-5.4 2.85 1.03-6.02-4.38-4.27 6.05-.88L12 3Z" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m18 6-12 12M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
