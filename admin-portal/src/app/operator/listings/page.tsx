"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BedDouble, CalendarDays, Car, CircleDollarSign, Lock, MapPin, ShieldCheck, Users, X } from "lucide-react";
import clsx from "clsx";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

type HostApprovalStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
type VerificationStatus =
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "FIELD_INSPECTION_REQUIRED"
  | "FIELD_INSPECTION_FAILED"
  | "NEEDS_MORE_INFO"
  | "HIGH_RISK_REVIEW"
  | "PENDING_REVIEW";

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
  ownerAlias?: string | null;
  verificationStatus?: VerificationStatus;
  riskScore?: number;
  riskLevel?: string;
  riskReasons?: string[];
  latestRevisionRequest?: {
    createdAt: string;
    notes?: string | null;
    requestedItems: string[];
  } | null;
  latestFieldInspection?: {
    id?: string;
    status: string;
    reportResult?: string | null;
    reportNotes?: string | null;
    dueDate?: string | null;
    createdAt: string;
    assigneeEmail?: string | null;
    requestedAt?: string | null;
    notes?: string | null;
  } | null;
  host: {
    email: string;
    name?: string | null;
    displayName?: string | null;
    phone?: string | null;
    address?: string | null;
    nationality?: string | null;
    hostApprovalRequests?: {
      id: string;
      status: HostApprovalStatus;
      createdAt?: string;
      reviewedAt?: string | null;
      notes?: string | null;
      documents?: unknown;
    }[];
  };
  owners?: {
    firstName: string;
    lastName: string;
    birthDate: string;
  }[];
  images?: { url: string }[];
  createdAt: string;
}

type ActionType = "approve" | "reject" | "revision" | "inspection";
type PanelType = "host-profile" | ActionType | null;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  SUSPENDED: "bg-rose-50 text-rose-700",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Dang hoat dong",
  PENDING: "Cho duyet",
  INACTIVE: "Tu choi",
  SUSPENDED: "Da khoa",
};

const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  APPROVED: "Ho so du dieu kien",
  REJECTED: "Bi tu choi",
  SUSPENDED: "Tam dung",
  FIELD_INSPECTION_REQUIRED: "Can kiem tra thuc te",
  FIELD_INSPECTION_FAILED: "Kiem tra that bai",
  NEEDS_MORE_INFO: "Can bo sung thong tin",
  HIGH_RISK_REVIEW: "Rui ro cao",
  PENDING_REVIEW: "Dang xem xet",
};

const HOST_APPROVAL_LABEL: Record<HostApprovalStatus, string> = {
  PENDING: "Dang cho",
  UNDER_REVIEW: "Dang xem xet",
  APPROVED: "Da duyet",
  REJECTED: "Bi tu choi",
};

const TYPE_LABEL: Record<string, string> = {
  HOUSE: "Nha rieng",
  APARTMENT: "Can ho",
  VILLA: "Biet thu",
  HOMESTAY: "Homestay",
  HOTEL: "Khach san",
  RESORT: "Resort",
  UNIQUE: "Cho nghi dac biet",
};

const BOOKING_METHOD_LABEL: Record<string, string> = {
  INSTANT: "Xac nhan tuc thi",
  REQUEST: "Yeu cau xac nhan",
};

const CANCELLATION_LABEL: Record<string, string> = {
  FLEXIBLE: "Linh hoat",
  MODERATE: "Trung binh",
  STRICT: "Nghiem ngat",
  NON_REFUNDABLE: "Khong hoan tien",
};

const PARKING_LABEL: Record<string, string> = {
  FREE: "Do xe mien phi",
  PAID: "Do xe tra phi",
  NOT_AVAILABLE: "Khong co cho do xe",
};

const PET_LABEL: Record<string, string> = {
  ALLOWED: "Cho phep thu cung",
  ON_REQUEST: "Thu cung theo yeu cau",
  NOT_ALLOWED: "Khong nhan thu cung",
};

const requiredChecks = [
  "addressInProvince",
  "photosMatch",
  "basicInfoComplete",
  "legalInfoReviewed",
  "noPolicyViolation",
] as const;

const requiredCheckLabel: Record<(typeof requiredChecks)[number], string> = {
  addressInProvince: "Dia chi / vi tri dung",
  photosMatch: "Anh va mo ta khop",
  basicInfoComplete: "Thong tin co ban day du",
  legalInfoReviewed: "Ho so host / phap ly day du",
  noPolicyViolation: "Khong vi pham chinh sach",
};

const revisionOptions = [
  "addressInProvince",
  "photosMatch",
  "basicInfoComplete",
  "legalInfoReviewed",
  "noPolicyViolation",
] as const;

const revisionReasonLabel: Record<(typeof revisionOptions)[number], string> = {
  addressInProvince: "Thieu / sai dia chi",
  photosMatch: "Anh chua khop thuc te",
  basicInfoComplete: "Thong tin co ban chua day du",
  legalInfoReviewed: "Thieu ho so host / phap ly",
  noPolicyViolation: "Can xem lai vi pham chinh sach",
};

function formatPrice(value: Listing["pricePerNight"]) {
  const numberValue = typeof value === "string" ? Number(value) : value;
  if (!numberValue || Number.isNaN(numberValue)) return "Chua co gia";
  return `₫${numberValue.toLocaleString("vi-VN")}/dem`;
}

function DetailPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
      {icon}
      {label}
    </span>
  );
}

function CheckPill({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
      />
      <span>{label}</span>
    </label>
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
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [panelType, setPanelType] = useState<PanelType>(null);
  const [actionListing, setActionListing] = useState<Listing | null>(null);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [requestedItems, setRequestedItems] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(requiredChecks.map((key) => [key, false]))
  );

  const isProvince = user?.role === "OPERATOR_PROVINCE";
  const isApprovalArea = statusFilter === "PENDING" || view === "approval";

  const title = useMemo(() => {
    const prefix = isApprovalArea ? "Duyet co so luu tru" : "Quan ly co so";
    return `${prefix} - ${STATUS_LABEL[statusFilter] ?? statusFilter}`;
  }, [isApprovalArea, statusFilter]);

  function resetActionForm(type?: ActionType | null) {
    setActionError("");
    setActionBusy(false);
    setNotes("");
    setDueDate("");
    setRequestedItems([]);
    setChecklist(Object.fromEntries(requiredChecks.map((key) => [key, false])));
    setPanelType(type ?? null);
  }

  function openAction(listing: Listing, type: ActionType) {
    setActionListing(listing);
    resetActionForm(type);
  }

  function openHostProfile(listing: Listing) {
    setActionListing(listing);
    setActionError("");
    setActionBusy(false);
    setNotes("");
    setDueDate("");
    setRequestedItems([]);
    setChecklist(Object.fromEntries(requiredChecks.map((key) => [key, false])));
    setPanelType("host-profile");
  }

  function closeAction() {
    setActionListing(null);
    resetActionForm(null);
  }

  function load() {
    setLoading(true);
    setError("");
    const params = statusFilter ? `?status=${statusFilter}` : "";
    api
      .get(`/operator/listings${params}`)
      .then((r) => setData(r.data.data ?? { items: [], total: 0 }))
      .catch((err) => setError(err.response?.data?.error?.message ?? "Khong the tai danh sach co so."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function submitAction() {
    if (!actionListing || !panelType || panelType === "host-profile") return;

    if (panelType === "approve" && notes.trim().length < 20) {
      setActionError("Vui long nhap tom tat kiem tra it nhat 20 ky tu de luu bien ban duyet.");
      return;
    }

    setActionBusy(true);
    setActionError("");
    try {
      if (panelType === "approve") {
        await api.patch(`/operator/listings/${actionListing.id}/status`, {
          status: "ACTIVE",
          notes: notes.trim(),
          checklist: checklist,
        });
      } else if (panelType === "reject") {
        await api.patch(`/operator/listings/${actionListing.id}/status`, {
          status: "INACTIVE",
          notes: notes.trim(),
        });
      } else if (panelType === "revision") {
        await api.post(`/operator/listings/${actionListing.id}/request-revision`, {
          notes: notes.trim(),
          requestedItems,
        });
      } else if (panelType === "inspection") {
        await api.post(`/operator/listings/${actionListing.id}/field-inspection`, {
          notes: notes.trim(),
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        });
      }

      closeAction();
      load();
    } catch (err: unknown) {
      setActionError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Khong the thuc hien thao tac nay.");
    } finally {
      setActionBusy(false);
    }
  }

  async function suspendListing(id: string) {
    setError("");
    try {
      await api.patch(`/operator/listings/${id}/status`, { status: "SUSPENDED" });
      load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Khong the khoa co so.");
    }
  }

  const modalTitle =
    panelType === "approve"
      ? "Duyet mo ban"
      : panelType === "reject"
        ? "Tu choi co so"
        : panelType === "revision"
          ? "Yeu cau bo sung"
          : panelType === "inspection"
            ? "Yeu cau kiem tra thuc te"
            : "Ho so host";

  const listingApprovalStatus = actionListing?.host.hostApprovalRequests?.[0]?.status ?? "PENDING";
  const listingHostRequest = actionListing?.host.hostApprovalRequests?.[0] ?? null;
  const hostDocuments = listingHostRequest?.documents && typeof listingHostRequest.documents === "object"
    ? (listingHostRequest.documents as {
        source?: string;
        profile?: {
          displayName?: string | null;
          phone?: string | null;
          address?: string | null;
          nationality?: string | null;
        };
        latestProperty?: {
          title?: string;
          city?: string;
          legalEntityType?: string | null;
          ownerAlias?: string | null;
          owners?: { firstName: string; lastName: string; birthDate: string }[];
        };
      })
    : null;
  const hostProfileSnapshot = hostDocuments?.profile ?? null;
  const hostPropertySnapshot = hostDocuments?.latestProperty ?? null;
  const latestInspection = actionListing?.latestFieldInspection ?? null;
  const openInspection = latestInspection ? ["PENDING", "IN_PROGRESS"].includes(latestInspection.status) : false;
  const failedInspection = latestInspection?.status === "COMPLETED" && latestInspection.reportResult === "FAIL";
  const hasLegalSnapshot = Boolean(actionListing?.owners?.length);
  const canApprove = Boolean(actionListing) && hasLegalSnapshot && !openInspection && !failedInspection;

  return (
    <PortalShell title={title}>
      <div className="space-y-5">
        <div className="portal-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{data.total} co so</p>
            <p className="mt-1 text-xs text-slate-500">
              Duyet listing theo luong: ho so host, kiem tra thuc te, checklist noi dung, mo ban.
            </p>
          </div>
          <span className={`rounded px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[statusFilter] ?? "bg-slate-100 text-slate-700"}`}>
            {STATUS_LABEL[statusFilter] ?? statusFilter}
          </span>
        </div>

        {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4">
            {data.items.length === 0 ? <div className="portal-card py-16 text-center text-slate-400">Khong co co so trong trang thai nay.</div> : null}
            {data.items.map((listing) => {
              const imageUrl = listing.images?.[0]?.url;
              const focused = focusId === listing.id;
              const hostApproval = listing.host.hostApprovalRequests?.[0]?.status ?? "PENDING";
              const verificationStatus = listing.verificationStatus ?? "PENDING_REVIEW";
              const inspection = listing.latestFieldInspection;
              const openInspectionRow = inspection ? ["PENDING", "IN_PROGRESS"].includes(inspection.status) : false;
              const failedInspectionRow = inspection?.status === "COMPLETED" && inspection.reportResult === "FAIL";
              const hasLegalSnapshotRow = Boolean(listing.owners?.length);
              const canApproveListing = hasLegalSnapshotRow && !openInspectionRow && !failedInspectionRow;
              const hasRevisionRequest = Boolean(listing.latestRevisionRequest);
              const riskReasons = listing.riskReasons ?? [];
              const shouldShowRiskReasons =
                riskReasons.length > 0 &&
                (hasRevisionRequest || listing.riskLevel === "MEDIUM" || listing.riskLevel === "HIGH");
              const riskReasonTitle = hasRevisionRequest ? "Noi dung TripNest da yeu cau bo sung" : "Diem can kiem tra";

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
                          Chua co anh dai dien
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
                            {[listing.addressLine1, listing.city, listing.country ?? "Viet Nam"].filter(Boolean).join(", ")}
                          </p>
                        </div>
                        <div className="rounded-lg bg-teal-50 px-4 py-3 text-right">
                          <p className="text-xs text-teal-700">Gia cong bo</p>
                          <p className="mt-1 text-lg font-semibold text-teal-950">{formatPrice(listing.pricePerNight)}</p>
                        </div>
                      </div>

                      {listing.description ? <p className="mt-4 text-sm leading-6 text-slate-600">{listing.description}</p> : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <DetailPill icon={<Users size={14} />} label={`${listing.maxGuests ?? 0} khach`} />
                        <DetailPill icon={<BedDouble size={14} />} label={`${listing.bedroomCount ?? 0} phong ngu`} />
                        <DetailPill icon={<ShieldCheck size={14} />} label={listing.legalEntityType === "BUSINESS" ? "Doanh nghiep" : "Ca nhan"} />
                        <DetailPill icon={<CircleDollarSign size={14} />} label={BOOKING_METHOD_LABEL[listing.bookingMethod ?? ""] ?? "Chua ro cach dat"} />
                        <DetailPill icon={<CalendarDays size={14} />} label={`Huy: ${CANCELLATION_LABEL[listing.cancellationPolicy ?? ""] ?? "Chua cau hinh"}`} />
                        <DetailPill icon={<Car size={14} />} label={PARKING_LABEL[listing.parkingType ?? ""] ?? "Chua ro do xe"} />
                      </div>

                      <div className="mt-4 grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2">
                        <p>Bua sang: <span className="font-semibold text-slate-800">{listing.breakfastIncluded ? "Co" : "Khong"}</span></p>
                        <p>Thu cung: <span className="font-semibold text-slate-800">{PET_LABEL[listing.petsPolicy ?? ""] ?? "Chua cau hinh"}</span></p>
                        <p>Hut thuoc: <span className="font-semibold text-slate-800">{listing.smokingAllowed ? "Cho phep" : "Khong cho phep"}</span></p>
                        <p>Tiec/su kien: <span className="font-semibold text-slate-800">{listing.partiesAllowed ? "Cho phep" : "Khong cho phep"}</span></p>
                      </div>

                      <div className="mt-4 grid gap-2 rounded-md border border-slate-100 bg-white p-3 text-xs text-slate-600 sm:grid-cols-2">
                        <p>Ho so host/phap ly: <span className="font-semibold text-slate-800">{hostApproval === "APPROVED" ? "Da duyet" : hasLegalSnapshotRow ? "Lay tu ho so dang co so" : "Can bo sung"}</span></p>
                        <p>Danh gia noi dung: <span className="font-semibold text-slate-800">{VERIFICATION_LABEL[verificationStatus] ?? verificationStatus}</span></p>
                        {listing.riskLevel ? <p>Muc do rui ro: <span className="font-semibold text-slate-800">{listing.riskLevel}</span></p> : null}
                        {listing.riskScore != null ? <p>Diem rui ro: <span className="font-semibold text-slate-800">{listing.riskScore}/100</span></p> : null}
                      </div>

                      {shouldShowRiskReasons ? (
                        <div className="mt-3 rounded-md border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-900">
                          <p className="font-semibold">{riskReasonTitle}</p>
                          <ul className="mt-1 list-disc space-y-1 pl-4">
                            {riskReasons.map((reason) => <li key={reason}>{reason}</li>)}
                          </ul>
                        </div>
                      ) : null}

                      {inspection ? (
                        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-700">
                          <p className="font-semibold">Kiem tra thuc te</p>
                          <p className="mt-1">{inspection.status}.</p>
                          {inspection.dueDate ? <p className="mt-1">Han: {new Date(inspection.dueDate).toLocaleDateString("vi-VN")}.</p> : null}
                          {inspection.reportResult ? <p className="mt-1">Ket qua: {inspection.reportResult}.</p> : null}
                          {inspection.reportNotes ? <p className="mt-1">{inspection.reportNotes}</p> : null}
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div className="text-xs text-slate-400">
                          Host: <span className="font-medium text-slate-600">{listing.host?.email}</span> · Gui ngay {new Date(listing.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                        {isProvince && listing.status === "PENDING" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openHostProfile(listing)}
                              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Xem ho so host
                            </button>
                            <button
                              type="button"
                              onClick={() => openAction(listing, "revision")}
                              className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                            >
                              Yeu cau bo sung
                            </button>
                            <button
                              type="button"
                              onClick={() => openAction(listing, "inspection")}
                              className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              Kiem tra thuc te
                            </button>
                            <button
                              type="button"
                              disabled={!canApproveListing}
                              onClick={() => openAction(listing, "approve")}
                              className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              Duyet mo ban
                            </button>
                            <button
                              type="button"
                              onClick={() => openAction(listing, "reject")}
                              className="rounded-md bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Tu choi
                            </button>
                          </div>
                        ) : null}
                        {isProvince && listing.status === "ACTIVE" ? (
                          <button onClick={() => suspendListing(listing.id)} className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                            <Lock size={13} /> Khoa co so
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

      {actionListing && panelType ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{modalTitle}</h3>
                <p className="mt-1 text-sm text-slate-500">{actionListing.title}</p>
              </div>
              <button onClick={closeAction} aria-label="Dong">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {actionError ? <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</div> : null}

            {panelType === "host-profile" ? (
              <div className="space-y-4">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Snapshot ho so host</p>
                  <p className="mt-1 text-slate-500">
                    Dung de doi chieu nhanh truoc khi yeu cau bo sung, kiem tra thuc dia hoac mo ban.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border border-slate-200 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Thong tin lien he</p>
                    <div className="mt-2 space-y-2 text-sm text-slate-700">
                      <p><span className="font-medium text-slate-900">Email:</span> {actionListing.host.email}</p>
                      <p><span className="font-medium text-slate-900">Ten hien thi:</span> {hostProfileSnapshot?.displayName ?? actionListing.host.displayName ?? actionListing.host.name ?? actionListing.ownerAlias ?? "Chua co"}</p>
                      <p><span className="font-medium text-slate-900">Dien thoai:</span> {hostProfileSnapshot?.phone ?? actionListing.host.phone ?? "Chua co"}</p>
                      <p><span className="font-medium text-slate-900">Dia chi:</span> {hostProfileSnapshot?.address ?? actionListing.host.address ?? "Chua co"}</p>
                      <p><span className="font-medium text-slate-900">Quoc tich:</span> {hostProfileSnapshot?.nationality ?? actionListing.host.nationality ?? "Viet Nam"}</p>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Co so gan nhat</p>
                    <div className="mt-2 space-y-2 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">{hostPropertySnapshot?.title ?? actionListing.title}</p>
                      <p>{hostPropertySnapshot?.city ?? actionListing.city}</p>
                      <p>
                        {hostPropertySnapshot?.legalEntityType === "BUSINESS" ? "Doanh nghiep" : "Ca nhan"}
                        {hostPropertySnapshot?.ownerAlias ? ` - ${hostPropertySnapshot.ownerAlias}` : ""}
                      </p>
                      {hostPropertySnapshot?.owners?.length ? (
                        <p className="text-xs text-slate-500">
                          Chu so huu: {hostPropertySnapshot.owners.map((owner) => `${owner.firstName} ${owner.lastName}`).join(", ")}
                        </p>
                      ) : hasLegalSnapshot ? (
                        <p className="text-xs text-slate-500">
                          Chu so huu: {actionListing.owners?.map((owner) => `${owner.firstName} ${owner.lastName}`).join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 rounded-md border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 md:grid-cols-2">
                  <p>
                    <span className="font-medium text-slate-900">Trang thai ho so:</span> {HOST_APPROVAL_LABEL[listingApprovalStatus] ?? listingApprovalStatus}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Nguon snapshot:</span> {hostDocuments?.source ?? "listing-approval"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Danh gia noi dung:</span> {VERIFICATION_LABEL[actionListing.verificationStatus ?? "PENDING_REVIEW"] ?? "Chua co"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Rui ro:</span> {actionListing.riskLevel ?? "Chua cham"}
                  </p>
                </div>

                {listingHostRequest?.notes ? (
                  <div className="rounded-md border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-medium">Ghi chu gan nhat</p>
                    <p className="mt-1 leading-6">{listingHostRequest.notes}</p>
                  </div>
                ) : null}

                <div className="flex justify-end gap-3">
                  <button onClick={closeAction} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                    Dong
                  </button>
                </div>
              </div>
            ) : panelType === "approve" ? (
              <div className="space-y-4">
                <div className="rounded-md border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Chi mo ban khi da doi chieu du thong tin host/phap ly, anh, dia chi va noi dung listing khop thuc te.
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {requiredChecks.map((key) => (
                    <CheckPill
                      key={key}
                      checked={checklist[key]}
                      label={requiredCheckLabel[key]}
                      onToggle={() => setChecklist((current) => ({ ...current, [key]: !current[key] }))}
                    />
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Tom tat kiem tra *
                    <textarea
                      value={notes}
                      onChange={(event) => {
                        setNotes(event.target.value);
                        if (actionError) setActionError("");
                      }}
                      rows={3}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                      placeholder="Neu co the, ghi ngan gon ket luan kiem tra va ly do mo ban"
                    />
                    <span className={`text-xs ${notes.trim().length > 0 && notes.trim().length < 20 ? "text-amber-700" : "text-slate-400"}`}>
                      Can it nhat 20 ky tu de luu bien ban duyet. Hien tai: {notes.trim().length}/20.
                    </span>
                  </label>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="font-medium text-slate-800">Tinh trang doi chieu</p>
                    <p className="mt-1">{listingApprovalStatus === "APPROVED" ? "Da co snapshot host/phap ly" : hasLegalSnapshot ? "Du lieu host da nam trong listing" : "Can bo sung thong tin host/phap ly"}</p>
                    <p className="mt-1">{openInspection ? "Dang co phieu kiem tra thuc te mo" : failedInspection ? "Lan kiem tra gan nhat khong dat" : "Khong co phieu kiem tra dang mo"}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={closeAction} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                    Huy
                  </button>
                  <button
                    onClick={submitAction}
                    disabled={actionBusy || !canApprove || requiredChecks.some((key) => !checklist[key])}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {actionBusy ? "Dang duyet..." : "Duyet mo ban"}
                  </button>
                </div>
              </div>
            ) : null}

            {panelType === "reject" ? (
              <div className="space-y-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Ly do tu choi *
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    placeholder="Ghi ro ly do tu choi"
                  />
                </label>
                <div className="flex justify-end gap-3">
                  <button onClick={closeAction} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                    Huy
                  </button>
                  <button
                    onClick={submitAction}
                    disabled={actionBusy || notes.trim().length < 12}
                    className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {actionBusy ? "Dang xu ly..." : "Tu choi"}
                  </button>
                </div>
              </div>
            ) : null}

            {panelType === "revision" ? (
              <div className="space-y-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Noi dung can bo sung *
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    placeholder="Mo ta ro nhung muc host can bo sung"
                  />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  {revisionOptions.map((key) => (
                    <label key={key} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={requestedItems.includes(key)}
                        onChange={() =>
                          setRequestedItems((current) =>
                            current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                      />
                      {revisionReasonLabel[key]}
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={closeAction} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                    Huy
                  </button>
                  <button
                    onClick={submitAction}
                    disabled={actionBusy || notes.trim().length < 12 || requestedItems.length === 0}
                    className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {actionBusy ? "Dang gui..." : "Gui yeu cau bo sung"}
                  </button>
                </div>
              </div>
            ) : null}

            {panelType === "inspection" ? (
              <div className="space-y-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Noi dung kiem tra *
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    placeholder="Mo ta ly do can kiem tra thuc te"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Han kiem tra
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                  />
                </label>
                <div className="flex justify-end gap-3">
                  <button onClick={closeAction} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                    Huy
                  </button>
                  <button
                    onClick={submitAction}
                    disabled={actionBusy || notes.trim().length < 12}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {actionBusy ? "Dang gui..." : "Tao phieu kiem tra"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}
