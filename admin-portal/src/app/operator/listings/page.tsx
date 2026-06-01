"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BedDouble, CalendarDays, Car, CircleDollarSign, Lock, MapPin, ShieldCheck, Users } from "lucide-react";
import clsx from "clsx";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface Listing {
  id: string;
  title: string;
  description?: string | null;
  addressLine1?: string | null;
  city: string;
  country?: string | null;
  status: string;
  type: string;
  pricePerNight?: string | number | null;
  maxGuests?: number;
  bedroomCount?: number;
  bathrooms?: number;
  bookingMethod?: string;
  cancellationPolicy?: string;
  breakfastIncluded?: boolean;
  parkingType?: string;
  petsPolicy?: string;
  smokingAllowed?: boolean;
  partiesAllowed?: boolean;
  legalEntityType?: string;
  host: { email: string };
  images?: { url: string }[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  SUSPENDED: "bg-rose-50 text-rose-700",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  PENDING: "Chờ duyệt",
  INACTIVE: "Từ chối",
  SUSPENDED: "Đã khóa",
};

const TYPE_LABEL: Record<string, string> = {
  HOUSE: "Nhà riêng",
  APARTMENT: "Căn hộ",
  VILLA: "Biệt thự",
  HOMESTAY: "Homestay",
  HOTEL: "Khách sạn",
  RESORT: "Resort",
  UNIQUE: "Chỗ nghỉ độc đáo",
};

const BOOKING_METHOD_LABEL: Record<string, string> = {
  INSTANT: "Xác nhận tức thì",
  REQUEST: "Yêu cầu xác nhận",
};

const CANCELLATION_LABEL: Record<string, string> = {
  FLEXIBLE: "Linh hoạt",
  MODERATE: "Trung bình",
  STRICT: "Nghiêm ngặt",
  NON_REFUNDABLE: "Không hoàn tiền",
};

const PARKING_LABEL: Record<string, string> = {
  FREE: "Đỗ xe miễn phí",
  PAID: "Đỗ xe trả phí",
  NOT_AVAILABLE: "Không có chỗ đỗ xe",
};

const PET_LABEL: Record<string, string> = {
  ALLOWED: "Cho phép thú cưng",
  ON_REQUEST: "Thú cưng theo yêu cầu",
  NOT_ALLOWED: "Không nhận thú cưng",
};

function formatPrice(value: Listing["pricePerNight"]) {
  const numberValue = typeof value === "string" ? Number(value) : value;
  if (!numberValue || Number.isNaN(numberValue)) return "Chưa có giá";
  return `₫${numberValue.toLocaleString("vi-VN")}/đêm`;
}

function DetailPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
      {icon}
      {label}
    </span>
  );
}

export default function OperatorListingsPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "ACTIVE";
  const view = searchParams.get("view");
  const focusId = searchParams.get("focus");
  const [data, setData] = useState<{ items: Listing[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const isProvince = user?.role === "OPERATOR_PROVINCE";
  const isApprovalArea = statusFilter === "PENDING" || view === "approval";

  const title = useMemo(() => {
    const prefix = isApprovalArea ? "Duyệt cơ sở lưu trú" : "Quản lý cơ sở";
    return `${prefix} - ${STATUS_LABEL[statusFilter] ?? statusFilter}`;
  }, [isApprovalArea, statusFilter]);

  function load() {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : "";
    api.get(`/operator/listings${params}`)
      .then((r) => setData(r.data.data ?? { items: [], total: 0 }))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function suspendListing(id: string) {
    await api.patch(`/operator/listings/${id}/status`, { status: "SUSPENDED" });
    load();
  }

  async function updateStatus(id: string, status: "ACTIVE" | "INACTIVE") {
    await api.patch(`/operator/listings/${id}/status`, { status });
    load();
  }

  return (
    <PortalShell title={title}>
      <div className="space-y-5">
        <div className="portal-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{data.total} cơ sở</p>
            <p className="mt-1 text-xs text-slate-500">
              Xem nhanh ảnh, địa điểm, giá phòng, loại chỗ nghỉ và các chính sách vận hành của cơ sở trong địa bàn phụ trách.
            </p>
          </div>
          <span className={`rounded px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[statusFilter] ?? "bg-slate-100 text-slate-700"}`}>
            {STATUS_LABEL[statusFilter] ?? statusFilter}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4">
            {data.items.length === 0 ? <div className="portal-card py-16 text-center text-slate-400">Không có cơ sở trong trạng thái này.</div> : null}
            {data.items.map((listing) => {
              const imageUrl = listing.images?.[0]?.url;
              const focused = focusId === listing.id;
              return (
                <article
                  key={listing.id}
                  id={`listing-${listing.id}`}
                  className={clsx(
                    "portal-card overflow-hidden transition",
                    focused && "ring-2 ring-amber-400 ring-offset-2 ring-offset-[#f7fbfa]"
                  )}
                >
                  <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
                    <div className="relative min-h-56 bg-slate-100 lg:min-h-full">
                      {imageUrl ? (
                        <img src={imageUrl} alt={listing.title} className="h-full min-h-56 w-full object-cover" />
                      ) : (
                        <div className="flex h-full min-h-56 items-center justify-center bg-teal-50 text-sm font-medium text-teal-800">
                          Chưa có ảnh đại diện
                        </div>
                      )}
                      <span className={`absolute left-3 top-3 rounded px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[listing.status] ?? "bg-slate-100 text-slate-700"}`}>
                        {STATUS_LABEL[listing.status] ?? listing.status}
                      </span>
                    </div>

                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">{TYPE_LABEL[listing.type] ?? listing.type}</p>
                          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{listing.title}</h2>
                          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                            <MapPin size={15} className="text-teal-700" />
                            {[listing.addressLine1, listing.city, listing.country ?? "Việt Nam"].filter(Boolean).join(", ")}
                          </p>
                        </div>
                        <div className="rounded-lg bg-teal-50 px-4 py-3 text-right">
                          <p className="text-xs text-teal-700">Giá công bố</p>
                          <p className="mt-1 text-lg font-semibold text-teal-950">{formatPrice(listing.pricePerNight)}</p>
                        </div>
                      </div>

                      {listing.description ? <p className="mt-4 text-sm leading-6 text-slate-600">{listing.description}</p> : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <DetailPill icon={<Users size={14} />} label={`${listing.maxGuests ?? 0} khách`} />
                        <DetailPill icon={<BedDouble size={14} />} label={`${listing.bedroomCount ?? 0} phòng ngủ`} />
                        <DetailPill icon={<ShieldCheck size={14} />} label={listing.legalEntityType === "BUSINESS" ? "Doanh nghiệp" : "Cá nhân"} />
                        <DetailPill icon={<CircleDollarSign size={14} />} label={BOOKING_METHOD_LABEL[listing.bookingMethod ?? ""] ?? "Chưa rõ cách đặt"} />
                        <DetailPill icon={<CalendarDays size={14} />} label={`Hủy: ${CANCELLATION_LABEL[listing.cancellationPolicy ?? ""] ?? "Chưa cấu hình"}`} />
                        <DetailPill icon={<Car size={14} />} label={PARKING_LABEL[listing.parkingType ?? ""] ?? "Chưa rõ đỗ xe"} />
                      </div>

                      <div className="mt-4 grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2">
                        <p>Bữa sáng: <span className="font-semibold text-slate-800">{listing.breakfastIncluded ? "Có" : "Không"}</span></p>
                        <p>Thú cưng: <span className="font-semibold text-slate-800">{PET_LABEL[listing.petsPolicy ?? ""] ?? "Chưa cấu hình"}</span></p>
                        <p>Hút thuốc: <span className="font-semibold text-slate-800">{listing.smokingAllowed ? "Cho phép" : "Không cho phép"}</span></p>
                        <p>Tiệc/sự kiện: <span className="font-semibold text-slate-800">{listing.partiesAllowed ? "Cho phép" : "Không cho phép"}</span></p>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div className="text-xs text-slate-400">
                          Host: <span className="font-medium text-slate-600">{listing.host?.email}</span> · Gửi ngày {new Date(listing.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                        {isProvince && listing.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <button onClick={() => updateStatus(listing.id, "ACTIVE")} className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                              Duyệt mở bán
                            </button>
                            <button onClick={() => updateStatus(listing.id, "INACTIVE")} className="rounded-md bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                              Từ chối
                            </button>
                          </div>
                        ) : null}
                        {isProvince && listing.status === "ACTIVE" ? (
                          <button onClick={() => suspendListing(listing.id)} className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                            <Lock size={13} /> Khóa cơ sở
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
