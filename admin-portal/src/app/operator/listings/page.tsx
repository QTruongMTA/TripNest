"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, BedDouble, CalendarDays, Car, CheckCircle2, CircleDollarSign, ClipboardCheck, Lock, MapPin, ShieldCheck, Users, X } from "lucide-react";
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
  approvalChecklist?: {
    items: Array<{ key: string; label: string; passed: boolean }>;
    passed: number;
    total: number;
    score: number;
    blockingIssues: string[];
  };
  latestApprovalReview?: {
    id: string;
    decision: string;
    notes: string | null;
    createdAt: string;
    reviewer?: { email: string };
  } | null;
  approvalHistory?: Array<{
    id: string;
    decision: string;
    notes: string | null;
    createdAt: string;
    reviewer?: { email: string };
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  SUSPENDED: "bg-rose-50 text-rose-700",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Äang hoáº¡t Ä‘á»™ng",
  PENDING: "Chá» duyá»‡t",
  INACTIVE: "Tá»« chá»‘i",
  SUSPENDED: "ÄÃ£ khÃ³a",
};

const TYPE_LABEL: Record<string, string> = {
  HOUSE: "NhÃ  riÃªng",
  APARTMENT: "CÄƒn há»™",
  VILLA: "Biá»‡t thá»±",
  HOMESTAY: "Homestay",
  HOTEL: "KhÃ¡ch sáº¡n",
  RESORT: "Resort",
  UNIQUE: "Chá»— nghá»‰ Ä‘á»™c Ä‘Ã¡o",
};

const BOOKING_METHOD_LABEL: Record<string, string> = {
  INSTANT: "XÃ¡c nháº­n tá»©c thÃ¬",
  REQUEST: "YÃªu cáº§u xÃ¡c nháº­n",
};

const CANCELLATION_LABEL: Record<string, string> = {
  FLEXIBLE: "Linh hoáº¡t",
  MODERATE: "Trung bÃ¬nh",
  STRICT: "NghiÃªm ngáº·t",
  NON_REFUNDABLE: "KhÃ´ng hoÃ n tiá»n",
};

const PARKING_LABEL: Record<string, string> = {
  FREE: "Äá»— xe miá»…n phÃ­",
  PAID: "Äá»— xe tráº£ phÃ­",
  NOT_AVAILABLE: "KhÃ´ng cÃ³ chá»— Ä‘á»— xe",
};

const PET_LABEL: Record<string, string> = {
  ALLOWED: "Cho phÃ©p thÃº cÆ°ng",
  ON_REQUEST: "ThÃº cÆ°ng theo yÃªu cáº§u",
  NOT_ALLOWED: "KhÃ´ng nháº­n thÃº cÆ°ng",
};

function formatPrice(value: Listing["pricePerNight"]) {
  const numberValue = typeof value === "string" ? Number(value) : value;
  if (!numberValue || Number.isNaN(numberValue)) return "ChÆ°a cÃ³ giÃ¡";
  return `â‚«${numberValue.toLocaleString("vi-VN")}/Ä‘Ãªm`;
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
  const [reviewModal, setReviewModal] = useState<{ listing: Listing; status: "ACTIVE" | "INACTIVE" | "SUSPENDED" } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isProvince = user?.role === "OPERATOR_PROVINCE";
  const isApprovalArea = statusFilter === "PENDING" || view === "approval";

  const title = useMemo(() => {
    const prefix = isApprovalArea ? "Duyá»‡t cÆ¡ sá»Ÿ lÆ°u trÃº" : "Quáº£n lÃ½ cÆ¡ sá»Ÿ";
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

  function openReview(listing: Listing, status: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
    setReviewModal({ listing, status });
    setReviewNotes(status === "ACTIVE" ? "ÄÃ£ kiá»ƒm tra Ä‘áº§y Ä‘á»§, Ä‘á»§ Ä‘iá»u kiá»‡n má»Ÿ bÃ¡n." : "");
  }

  async function submitReview() {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      await api.patch(`/operator/listings/${reviewModal.listing.id}/status`, {
        status: reviewModal.status,
        notes: reviewNotes,
        checklist: reviewModal.listing.approvalChecklist ?? null,
        issues: reviewModal.status === "ACTIVE" ? [] : reviewModal.listing.approvalChecklist?.blockingIssues ?? [],
      });
      setReviewModal(null);
      setReviewNotes("");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function suspendListing(listing: Listing) {
    openReview(listing, "SUSPENDED");
  }

  async function updateStatus(listing: Listing, status: "ACTIVE" | "INACTIVE") {
    openReview(listing, status);
  }

  return (
    <PortalShell title={title}>
      <div className="space-y-5">
        <div className="portal-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{data.total} cÆ¡ sá»Ÿ</p>
            <p className="mt-1 text-xs text-slate-500">
              Xem nhanh áº£nh, Ä‘á»‹a Ä‘iá»ƒm, giÃ¡ phÃ²ng, loáº¡i chá»— nghá»‰ vÃ  cÃ¡c chÃ­nh sÃ¡ch váº­n hÃ nh cá»§a cÆ¡ sá»Ÿ trong Ä‘á»‹a bÃ n phá»¥ trÃ¡ch.
            </p>
          </div>
          <span className={`rounded px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[statusFilter] ?? "bg-slate-100 text-slate-700"}`}>
            {STATUS_LABEL[statusFilter] ?? statusFilter}
          </span>
        </div>

        {reviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Listing approval</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">
                    {reviewModal.status === "ACTIVE" ? "Duyá»‡t má»Ÿ bÃ¡n" : reviewModal.status === "SUSPENDED" ? "KhÃ³a cÆ¡ sá»Ÿ" : "YÃªu cáº§u chá»‰nh sá»­a"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{reviewModal.listing.title}</p>
                </div>
                <button onClick={() => setReviewModal(null)} aria-label="ÄÃ³ng"><X size={20} className="text-slate-400" /></button>
              </div>

              {reviewModal.listing.approvalChecklist && (
                <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Checklist cháº¥t lÆ°á»£ng</p>
                    <span className="text-xs font-semibold text-teal-700">
                      {reviewModal.listing.approvalChecklist.passed}/{reviewModal.listing.approvalChecklist.total}
                    </span>
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {reviewModal.listing.approvalChecklist.items.map((item) => (
                      <div key={item.key} className="flex items-center gap-2 text-xs">
                        {item.passed ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-amber-600" />}
                        <span className={item.passed ? "text-slate-600" : "font-medium text-amber-800"}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reviewModal.status === "ACTIVE" && reviewModal.listing.approvalChecklist && reviewModal.listing.approvalChecklist.blockingIssues.length > 0 && (
                <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  CÃ²n háº¡ng má»¥c chÆ°a Ä‘áº¡t. Náº¿u váº«n duyá»‡t, ghi rÃµ lÃ½ do ngoáº¡i lá»‡ trong ghi chÃº.
                </div>
              )}

              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                placeholder={reviewModal.status === "ACTIVE" ? "Ghi chÃº duyá»‡t hoáº·c lÃ½ do ngoáº¡i lá»‡..." : "LÃ½ do cáº§n chá»‰nh sá»­a / khÃ³a cÆ¡ sá»Ÿ *"}
                className="mb-4 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-800/20"
              />
              <div className="flex gap-3">
                <button onClick={() => setReviewModal(null)} className="flex-1 rounded-md border border-slate-300 py-2 text-sm text-slate-700">Há»§y</button>
                <button
                  onClick={submitReview}
                  disabled={submitting || (reviewModal.status !== "ACTIVE" && !reviewNotes.trim())}
                  className={`flex-1 rounded-md py-2 text-sm font-medium text-white disabled:opacity-50 ${reviewModal.status === "ACTIVE" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
                >
                  {submitting ? "Äang lÆ°u..." : reviewModal.status === "ACTIVE" ? "XÃ¡c nháº­n duyá»‡t" : "Gá»­i quyáº¿t Ä‘á»‹nh"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4">
            {data.items.length === 0 ? <div className="portal-card py-16 text-center text-slate-400">KhÃ´ng cÃ³ cÆ¡ sá»Ÿ trong tráº¡ng thÃ¡i nÃ y.</div> : null}
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
                          ChÆ°a cÃ³ áº£nh Ä‘áº¡i diá»‡n
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
                            {[listing.addressLine1, listing.city, listing.country ?? "Viá»‡t Nam"].filter(Boolean).join(", ")}
                          </p>
                        </div>
                        <div className="rounded-lg bg-teal-50 px-4 py-3 text-right">
                          <p className="text-xs text-teal-700">GiÃ¡ cÃ´ng bá»‘</p>
                          <p className="mt-1 text-lg font-semibold text-teal-950">{formatPrice(listing.pricePerNight)}</p>
                        </div>
                      </div>

                      {listing.description ? <p className="mt-4 text-sm leading-6 text-slate-600">{listing.description}</p> : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <DetailPill icon={<Users size={14} />} label={`${listing.maxGuests ?? 0} khÃ¡ch`} />
                        <DetailPill icon={<BedDouble size={14} />} label={`${listing.bedroomCount ?? 0} phÃ²ng ngá»§`} />
                        <DetailPill icon={<ShieldCheck size={14} />} label={listing.legalEntityType === "BUSINESS" ? "Doanh nghiá»‡p" : "CÃ¡ nhÃ¢n"} />
                        <DetailPill icon={<CircleDollarSign size={14} />} label={BOOKING_METHOD_LABEL[listing.bookingMethod ?? ""] ?? "ChÆ°a rÃµ cÃ¡ch Ä‘áº·t"} />
                        <DetailPill icon={<CalendarDays size={14} />} label={`Há»§y: ${CANCELLATION_LABEL[listing.cancellationPolicy ?? ""] ?? "ChÆ°a cáº¥u hÃ¬nh"}`} />
                        <DetailPill icon={<Car size={14} />} label={PARKING_LABEL[listing.parkingType ?? ""] ?? "ChÆ°a rÃµ Ä‘á»— xe"} />
                      </div>

                      {listing.approvalChecklist && (
                        <div className="mt-4 rounded-md border border-slate-100 bg-white p-3">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                              <ClipboardCheck size={14} className="text-teal-700" />
                              Checklist duyệt: {listing.approvalChecklist.passed}/{listing.approvalChecklist.total}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${listing.approvalChecklist.score >= 100 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {listing.approvalChecklist.score}%
                            </span>
                          </div>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {listing.approvalChecklist.items.map((item) => (
                              <div key={item.key} className="flex items-center gap-2 text-xs">
                                {item.passed ? <CheckCircle2 size={13} className="text-emerald-600" /> : <AlertTriangle size={13} className="text-amber-600" />}
                                <span className={item.passed ? "text-slate-500" : "font-medium text-amber-800"}>{item.label}</span>
                              </div>
                            ))}
                          </div>
                          {listing.latestApprovalReview?.notes ? (
                            <p className="mt-3 rounded bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
                              Ghi chú gần nhất: {listing.latestApprovalReview.notes}
                            </p>
                          ) : null}
                        </div>
                      )}
                      <div className="mt-4 grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2">
                        <p>Bá»¯a sÃ¡ng: <span className="font-semibold text-slate-800">{listing.breakfastIncluded ? "CÃ³" : "KhÃ´ng"}</span></p>
                        <p>ThÃº cÆ°ng: <span className="font-semibold text-slate-800">{PET_LABEL[listing.petsPolicy ?? ""] ?? "ChÆ°a cáº¥u hÃ¬nh"}</span></p>
                        <p>HÃºt thuá»‘c: <span className="font-semibold text-slate-800">{listing.smokingAllowed ? "Cho phÃ©p" : "KhÃ´ng cho phÃ©p"}</span></p>
                        <p>Tiá»‡c/sá»± kiá»‡n: <span className="font-semibold text-slate-800">{listing.partiesAllowed ? "Cho phÃ©p" : "KhÃ´ng cho phÃ©p"}</span></p>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div className="text-xs text-slate-400">
                          Host: <span className="font-medium text-slate-600">{listing.host?.email}</span> Â· Gá»­i ngÃ y {new Date(listing.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                        {isProvince && listing.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <button onClick={() => updateStatus(listing, "ACTIVE")} className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                              Duyá»‡t má»Ÿ bÃ¡n
                            </button>
                            <button onClick={() => updateStatus(listing, "INACTIVE")} className="rounded-md bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                              Tá»« chá»‘i
                            </button>
                          </div>
                        ) : null}
                        {isProvince && listing.status === "ACTIVE" ? (
                          <button onClick={() => suspendListing(listing)} className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                            <Lock size={13} /> KhÃ³a cÆ¡ sá»Ÿ
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

