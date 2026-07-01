"use client";

import MessageThread from "@/components/booking/MessageThread";
import SupportCasePanel, { type BookingDispute } from "@/components/booking/SupportCasePanel";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type BookingModification = {
  id: string;
  requestedBy: string;
  requesterRole: string;
  status: string;
  newCheckIn: string | null;
  newCheckOut: string | null;
  newNumGuests: number | null;
  oldCheckIn: string | null;
  oldCheckOut: string | null;
  oldNumGuests: number;
  oldTotalPrice: number;
  newTotalPrice: number;
  priceDelta: number;
  expiresAt: string;
  respondedAt: string | null;
  respondedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

type BookingEvent = {
  id: string;
  type: string;
  actorRole: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type BookingReview = {
  id: string;
  rating: number;
  cleanliness: number;
  comfort: number;
  location: number;
  facilities: number;
  staff: number;
  valueForMoney: number;
  comment: string;
  hostReply: string | null;
  hostRepliedAt: string | null;
  createdAt: string;
  images: Array<{ id: string; url: string }>;
};

type TravelerBookingDetail = {
  id: string;
  type: string;
  status: string;
  paymentStatus: string;
  checkIn: string | null;
  checkOut: string | null;
  numGuests: number;
  totalPrice: number;
  notes: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
  nights: number | null;
  daysUntilCheckIn: number | null;
  property: {
    id: string;
    title: string;
    city: string;
    country: string;
    pricePerNight: number;
    cleaningFee: number | null;
    cancellationPolicy: string;
    cancellationFreeDays: number;
    thumbnailUrl: string | null;
  } | null;
  payment: {
    id: string;
    amount: number;
    status: string;
    method: string;
    paidAt: string | null;
    refundAmount: number | null;
    transferReference: string | null;
  } | null;
  review: BookingReview | null;
  events: BookingEvent[];
  modifications: BookingModification[];
  disputes: BookingDispute[];
  refundEstimate: {
    eligible: boolean;
    amount: number | null;
    percentage: number | null;
    reason: string;
  };
};

// ── Label maps ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:            { label: "Chờ xác nhận",   className: "bg-amber-100 text-amber-800" },
  CONFIRMED:          { label: "Đã xác nhận",    className: "bg-emerald-100 text-emerald-800" },
  COMPLETED:          { label: "Hoàn tất",        className: "bg-sky-100 text-sky-800" },
  CANCELLED:          { label: "Đã hủy",          className: "bg-slate-100 text-slate-600" },
  CANCELLED_BY_GUEST: { label: "Bạn đã hủy",     className: "bg-slate-100 text-slate-600" },
  CANCELLED_BY_HOST:  { label: "Chủ nhà hủy",    className: "bg-rose-100 text-rose-700" },
  EXPIRED:            { label: "Hết hạn",         className: "bg-orange-100 text-orange-700" },
  NO_SHOW:            { label: "Không đến",       className: "bg-rose-100 text-rose-700" },
};

const PAYMENT_CONFIG: Record<string, { label: string; className: string }> = {
  UNPAID:             { label: "Chưa thanh toán",  className: "bg-amber-100 text-amber-800" },
  PAID:               { label: "Đã thanh toán",    className: "bg-emerald-100 text-emerald-800" },
  REFUNDED:           { label: "Đã hoàn tiền",     className: "bg-sky-100 text-sky-800" },
  PARTIALLY_REFUNDED: { label: "Hoàn một phần",    className: "bg-blue-100 text-blue-700" },
  PENDING_PAYMENT:    { label: "Cần thanh toán thêm", className: "bg-rose-100 text-rose-700" },
  FAILED:             { label: "Thất bại",          className: "bg-rose-100 text-rose-700" },
};

const POLICY_LABEL: Record<string, string> = {
  FLEXIBLE:       "Linh hoạt",
  MODERATE:       "Vừa phải",
  STRICT:         "Nghiêm ngặt",
  NON_REFUNDABLE: "Không hoàn tiền",
};

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  CASH:          "Tiền mặt",
  MOMO:          "MoMo",
  VNPAY:         "VNPay",
  ZALOPAY:       "ZaloPay",
  CREDIT_CARD:   "Thẻ tín dụng",
};

const EVENT_CONFIG: Record<string, { icon: string; label: string }> = {
  CREATED:                { icon: "📋", label: "Đơn được tạo" },
  CONFIRMED:              { icon: "✅", label: "Đã xác nhận" },
  CONFIRMED_AUTO:         { icon: "⚡", label: "Xác nhận tự động" },
  PAYMENT_CREATED:        { icon: "💳", label: "Tạo bản ghi thanh toán" },
  CANCELLED_BY_GUEST:     { icon: "🚪", label: "Khách hủy" },
  CANCELLED_BY_HOST:      { icon: "🏠", label: "Host hủy" },
  CANCELLED_BY_ADMIN:     { icon: "🛡️", label: "Admin hủy" },
  NO_SHOW:                { icon: "👻", label: "Không đến nhận phòng" },
  COMPLETED:              { icon: "🏁", label: "Hoàn tất" },
  EXPIRED:                { icon: "⏰", label: "Hết hạn" },
  REFUND_FULL:            { icon: "💰", label: "Hoàn tiền 100%" },
  REFUND_PARTIAL:         { icon: "💸", label: "Hoàn tiền một phần" },
  REFUND_DENIED:          { icon: "🚫", label: "Không hoàn tiền" },
  MODIFICATION_REQUESTED: { icon: "✏️", label: "Yêu cầu thay đổi" },
  MODIFICATION_APPROVED:  { icon: "✅", label: "Thay đổi được chấp nhận" },
  MODIFICATION_REJECTED:  { icon: "✖️", label: "Thay đổi bị từ chối" },
  MODIFICATION_EXPIRED:   { icon: "⏳", label: "Yêu cầu thay đổi hết hạn" },
  MODIFICATION_CANCELLED:          { icon: "🗑️", label: "Yêu cầu thay đổi bị hủy" },
  PAYMENT_PENDING_VERIFICATION:    { icon: "🔔", label: "Đã báo chuyển khoản" },
  PAYMENT_CONFIRMED:               { icon: "✅", label: "Thanh toán được xác nhận" },
};

const MOD_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "Đang chờ",        className: "bg-amber-100 text-amber-800" },
  APPROVED:  { label: "Đã chấp nhận",    className: "bg-emerald-100 text-emerald-800" },
  REJECTED:  { label: "Đã từ chối",      className: "bg-rose-100 text-rose-700" },
  EXPIRED:   { label: "Đã hết hạn",      className: "bg-orange-100 text-orange-700" },
  CANCELLED: { label: "Đã hủy",          className: "bg-slate-100 text-slate-600" },
};

const REVIEW_CRITERIA = [
  ["cleanliness", "Sạch sẽ"],
  ["comfort", "Thoải mái"],
  ["location", "Vị trí"],
  ["facilities", "Tiện nghi"],
  ["staff", "Chủ nhà"],
  ["valueForMoney", "Đáng tiền"],
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatMoney(n: number) { return n.toLocaleString("vi-VN") + " ₫"; }
function isoToInput(iso: string | null) { return iso ?? ""; }

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function TravelerBookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<TravelerBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showModModal, setShowModModal] = useState(false);
  const [modForm, setModForm] = useState({ newCheckIn: "", newCheckOut: "", newNumGuests: "" });
  const [rejectModId, setRejectModId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    cleanliness: 5,
    comfort: 5,
    location: 5,
    facilities: 5,
    staff: 5,
    valueForMoney: 5,
    comment: "",
    imageUrls: [] as string[],
  });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { router.push("/login"); return; }
    try {
      const res = await fetch(`${API}/bookings/${bookingId}`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await res.json();
      if (!res.ok) { setError(payload.error?.message ?? "Không thể tải chi tiết."); return; }
      setBooking(payload.data);
    } catch { setError("Không thể kết nối tới máy chủ."); }
    finally { setLoading(false); }
  }, [bookingId, router]);

  useEffect(() => {
    const user = getStoredUser();
    if (!getAccessToken()) { router.push("/login"); return; }
    if (user?.role === "HOST") { router.push("/host/bookings"); return; }
    fetchDetail();
  }, [fetchDetail, router]);

  async function callPatch(path: string, body?: Record<string, unknown>) {
    const token = getAccessToken();
    if (!token || !booking) return null;
    setActionError(null);
    try {
      const res = await fetch(`${API}${path}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await res.json();
      if (!res.ok) { setActionError(payload.error?.message ?? "Lỗi thao tác."); return null; }
      return payload;
    } catch { setActionError("Không thể kết nối tới máy chủ."); return null; }
  }

  async function callDelete(path: string) {
    const token = getAccessToken();
    if (!token || !booking) return null;
    setActionError(null);
    try {
      const res = await fetch(`${API}${path}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) { setActionError(payload.error?.message ?? "Lỗi thao tác."); return null; }
      return payload;
    } catch { setActionError("Không thể kết nối tới máy chủ."); return null; }
  }

  async function handleCancel() {
    setActionLoading("cancel");
    const payload = await callPatch(`/bookings/${bookingId}/cancel`, cancelReason.trim() ? { reason: cancelReason.trim() } : undefined);
    setActionLoading(null);
    if (payload) { setShowCancelModal(false); setCancelReason(""); await fetchDetail(); }
  }

  async function handleRequestMod() {
    setActionLoading("mod-request");
    const body: Record<string, unknown> = {};
    if (modForm.newCheckIn)    body.newCheckIn  = modForm.newCheckIn;
    if (modForm.newCheckOut)   body.newCheckOut = modForm.newCheckOut;
    if (modForm.newNumGuests)  body.newNumGuests = Number(modForm.newNumGuests);

    const res = await fetch(`${API}/bookings/${bookingId}/modifications`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getAccessToken()!}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json();
    setActionLoading(null);
    if (!res.ok) { setActionError(payload.error?.message ?? "Lỗi tạo yêu cầu."); return; }
    setShowModModal(false);
    setModForm({ newCheckIn: "", newCheckOut: "", newNumGuests: "" });
    await fetchDetail();
  }

  async function handleRespondMod(modId: string, decision: "APPROVED" | "REJECTED") {
    setActionLoading(`mod-respond-${modId}`);
    const body: Record<string, unknown> = { decision };
    if (decision === "REJECTED" && rejectReason.trim()) body.rejectionReason = rejectReason.trim();
    const payload = await callPatch(`/bookings/${bookingId}/modifications/${modId}/respond`, body);
    setActionLoading(null);
    if (payload) { setRejectModId(null); setRejectReason(""); await fetchDetail(); }
  }

  async function handleCancelMod(modId: string) {
    setActionLoading(`mod-cancel-${modId}`);
    const payload = await callDelete(`/bookings/${bookingId}/modifications/${modId}`);
    setActionLoading(null);
    if (payload) await fetchDetail();
  }

  async function handleMarkTransferred() {
    setActionLoading("mark-transferred");
    const payload = await callPatch(`/bookings/${bookingId}/payment/mark-transferred`);
    setActionLoading(null);
    if (payload) await fetchDetail();
  }

  async function handleReviewImages(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, 5 - reviewForm.imageUrls.length);
    const dataUrls = await Promise.all(selected.map(fileToDataUrl));
    setReviewForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, ...dataUrls].slice(0, 5) }));
  }

  async function handleSubmitReview() {
    if (!booking) return;
    if (reviewForm.comment.trim().length < 10) {
      setReviewError("Vui lòng nhập nhận xét ít nhất 10 ký tự.");
      return;
    }
    setReviewSaving(true);
    setReviewError(null);
    try {
      const res = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()!}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          rating: reviewForm.rating,
          cleanliness: reviewForm.cleanliness,
          comfort: reviewForm.comfort,
          location: reviewForm.location,
          facilities: reviewForm.facilities,
          staff: reviewForm.staff,
          valueForMoney: reviewForm.valueForMoney,
          comment: reviewForm.comment,
          imageUrls: reviewForm.imageUrls,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setReviewError(payload.error?.message ?? "Không thể gửi đánh giá.");
        return;
      }
      setReviewForm({
        rating: 5, cleanliness: 5, comfort: 5, location: 5,
        facilities: 5, staff: 5, valueForMoney: 5, comment: "", imageUrls: [],
      });
      await fetchDetail();
    } catch {
      setReviewError("Không thể kết nối để gửi đánh giá.");
    } finally {
      setReviewSaving(false);
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-400">Đang tải...</div>;
  if (error || !booking) return <div className="rounded-2xl bg-rose-50 px-6 py-5 text-rose-700">{error ?? "Không tìm thấy đơn đặt."}</div>;

  const currentUserId = getStoredUser()?.id ?? "";
  const statusCfg  = STATUS_CONFIG[booking.status]  ?? { label: booking.status,        className: "bg-slate-100 text-slate-600" };
  const paymentCfg = PAYMENT_CONFIG[booking.paymentStatus] ?? { label: booking.paymentStatus, className: "bg-slate-100 text-slate-600" };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const checkInDate  = booking.checkIn  ? new Date(booking.checkIn)  : null;
  const isConfirmed  = booking.status === "CONFIRMED";
  const canCancel    = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const checkInPast  = checkInDate !== null && checkInDate <= today;
  const canModify    = isConfirmed && !checkInPast;
  const canReview    = booking.status === "COMPLETED" && !booking.review;

  const activeMod = booking.modifications.find(m => m.status === "PENDING") ?? null;
  const pastMods  = booking.modifications.filter(m => m.status !== "PENDING");

  // Price preview in modification modal
  const modPreviewNights = modForm.newCheckIn && modForm.newCheckOut
    ? Math.round((new Date(modForm.newCheckOut).getTime() - new Date(modForm.newCheckIn).getTime()) / (1000 * 60 * 60 * 24))
    : booking.nights;
  const modPreviewTotal = modPreviewNights != null && booking.property
    ? modPreviewNights * booking.property.pricePerNight + (booking.property.cleaningFee ?? 0)
    : null;
  const modPreviewDelta = modPreviewTotal != null ? modPreviewTotal - booking.totalPrice : null;

  return (
    <section>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/traveler/bookings" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            ← Lịch sử đặt phòng
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Chi tiết đơn #{booking.id.slice(-8).toUpperCase()}</h1>
          <p className="mt-1 text-sm text-slate-500">Tạo lúc {formatDateTime(booking.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusCfg.className}`}>{statusCfg.label}</span>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${paymentCfg.className}`}>{paymentCfg.label}</span>
        </div>
      </div>

      {actionError && <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</div>}

      {/* ── Action buttons ── */}
      <div className="mb-6 flex flex-wrap gap-3">
        {canModify && !activeMod && (
          <button
            onClick={() => {
              setModForm({ newCheckIn: isoToInput(booking.checkIn), newCheckOut: isoToInput(booking.checkOut), newNumGuests: String(booking.numGuests) });
              setShowModModal(true);
            }}
            disabled={actionLoading !== null}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            Yêu cầu thay đổi
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={actionLoading !== null}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy đơn
          </button>
        )}
      </div>

      {/* ── Main layout ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">

          {/* Stay details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Chi tiết lưu trú</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <div><dt className="text-xs text-slate-500">Check-in</dt><dd className="mt-1 font-medium">{booking.checkIn ? formatDate(booking.checkIn) : "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Check-out</dt><dd className="mt-1 font-medium">{booking.checkOut ? formatDate(booking.checkOut) : "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Số đêm</dt><dd className="mt-1 font-medium">{booking.nights ?? "—"} đêm</dd></div>
              <div><dt className="text-xs text-slate-500">Số khách</dt><dd className="mt-1 font-medium">{booking.numGuests} người</dd></div>
            </dl>
            {booking.notes && (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                <p className="mb-1 text-xs font-medium text-slate-500">Ghi chú của bạn</p>
                <p className="text-sm text-slate-700">{booking.notes}</p>
              </div>
            )}
            {booking.cancelledAt && (
              <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3">
                <p className="mb-1 text-xs font-medium text-rose-600">Đã hủy lúc {formatDateTime(booking.cancelledAt)}</p>
                {booking.cancelledReason && <p className="text-sm text-rose-700">Lý do: {booking.cancelledReason}</p>}
              </div>
            )}
          </div>

          {/* Active modification panel */}
          {activeMod && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-700">Yêu cầu thay đổi đang chờ</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Hết hạn {formatDateTime(activeMod.expiresAt)}
                </span>
              </div>
              <p className="mb-3 text-xs text-amber-600">
                {activeMod.requesterRole === "HOST" ? "Host đề xuất thay đổi — bạn cần phản hồi." : "Bạn đã gửi yêu cầu thay đổi, đang chờ host phản hồi."}
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                {activeMod.newCheckIn  && <div><dt className="text-slate-500">Check-in mới</dt><dd className="font-medium">{formatDate(activeMod.newCheckIn)}</dd></div>}
                {activeMod.newCheckOut && <div><dt className="text-slate-500">Check-out mới</dt><dd className="font-medium">{formatDate(activeMod.newCheckOut)}</dd></div>}
                {activeMod.newNumGuests != null && <div><dt className="text-slate-500">Số khách mới</dt><dd className="font-medium">{activeMod.newNumGuests}</dd></div>}
                <div>
                  <dt className="text-slate-500">Giá thay đổi</dt>
                  <dd className={`font-semibold ${activeMod.priceDelta > 0 ? "text-rose-600" : activeMod.priceDelta < 0 ? "text-emerald-600" : "text-slate-700"}`}>
                    {activeMod.priceDelta > 0 ? `+${formatMoney(activeMod.priceDelta)}` : activeMod.priceDelta < 0 ? `-${formatMoney(Math.abs(activeMod.priceDelta))}` : "Không đổi"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-3">
                {activeMod.requesterRole === "HOST" && (
                  <>
                    <button
                      onClick={() => handleRespondMod(activeMod.id, "APPROVED")}
                      disabled={actionLoading !== null}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionLoading === `mod-respond-${activeMod.id}` ? "Đang xử lý..." : "Chấp nhận"}
                    </button>
                    <button
                      onClick={() => setRejectModId(activeMod.id)}
                      disabled={actionLoading !== null}
                      className="rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      Từ chối
                    </button>
                  </>
                )}
                {activeMod.requestedBy === currentUserId && (
                  <button
                    onClick={() => handleCancelMod(activeMod.id)}
                    disabled={actionLoading !== null}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {actionLoading === `mod-cancel-${activeMod.id}` ? "Đang hủy..." : "Hủy yêu cầu"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Past modifications */}
          {pastMods.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Lịch sử thay đổi</h2>
              <div className="space-y-3">
                {pastMods.map((m) => {
                  const cfg = MOD_STATUS_CONFIG[m.status] ?? { label: m.status, className: "bg-slate-100 text-slate-600" };
                  return (
                    <div key={m.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">
                          {m.requesterRole === "GUEST" ? "Bạn yêu cầu" : "Host yêu cầu"}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
                      </div>
                      <div className="mt-1 text-slate-500">{formatDateTime(m.createdAt)}</div>
                      {m.rejectionReason && <p className="mt-1 text-rose-600">Lý do từ chối: {m.rejectionReason}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cancellation policy */}
          {booking.property && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Chính sách hủy</h2>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{POLICY_LABEL[booking.property.cancellationPolicy] ?? booking.property.cancellationPolicy}</p>
                  <p className="mt-1 text-sm text-slate-500">Hủy miễn phí trước {booking.property.cancellationFreeDays} ngày check-in</p>
                </div>
                <div className={`rounded-xl px-4 py-3 text-sm ${booking.refundEstimate.eligible ? "bg-emerald-50" : "bg-slate-50"}`}>
                  <p className="font-medium text-slate-700">
                    {booking.refundEstimate.eligible
                      ? `Nếu hủy ngay: hoàn ${booking.refundEstimate.percentage}%${booking.refundEstimate.amount ? ` (${formatMoney(booking.refundEstimate.amount)})` : ""}`
                      : "Nếu hủy ngay: không hoàn tiền"}
                  </p>
                  <p className="mt-0.5 text-slate-500">{booking.refundEstimate.reason}</p>
                </div>
              </div>
            </div>
          )}

          <SupportCasePanel
            endpointPath={`/bookings/${bookingId}/disputes`}
            initialCases={booking.disputes ?? []}
            viewerLabel="khách"
          />

          {/* Messages */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Tin nhắn</h2>
            <MessageThread
              bookingId={bookingId}
              viewerRole="GUEST"
              messagesPath={`/bookings/${bookingId}/messages`}
            />
          </div>

          {/* Event timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Lịch sử đơn đặt</h2>
            {booking.events.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có sự kiện nào.</p>
            ) : (
              <ol className="relative border-l border-slate-200 pl-6 space-y-5">
                {booking.events.map((evt) => {
                  const cfg = EVENT_CONFIG[evt.type] ?? { icon: "•", label: evt.type };
                  return (
                    <li key={evt.id} className="relative">
                      <span className="absolute -left-[1.625rem] flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 text-sm">{cfg.icon}</span>
                      <div>
                        <p className="font-medium text-slate-800">{cfg.label}</p>
                        {evt.message && <p className="mt-0.5 text-sm text-slate-600">{evt.message}</p>}
                        <p className="mt-1 text-xs text-slate-400">{evt.actorRole ? `[${evt.actorRole}] · ` : ""}{formatDateTime(evt.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          {/* Property card */}
          {booking.property && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Chỗ ở</h2>
              {booking.property.thumbnailUrl && (
                <img src={booking.property.thumbnailUrl} alt="" className="mb-3 h-28 w-full rounded-xl object-cover" />
              )}
              <p className="font-medium">{booking.property.title}</p>
              <p className="mt-1 text-sm text-slate-500">{booking.property.city}, {booking.property.country}</p>
              <p className="mt-2 text-sm text-slate-600">
                {formatMoney(booking.property.pricePerNight)} / đêm
                {booking.property.cleaningFee ? ` · Vệ sinh ${formatMoney(booking.property.cleaningFee)}` : ""}
              </p>
              <Link href={`/properties/${booking.property.id}`} className="mt-3 inline-block text-sm text-emerald-700 hover:underline">
                Xem chỗ ở →
              </Link>
            </div>
          )}

          {/* Review card */}
          {(canReview || booking.review) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Đánh giá sau lưu trú</h2>
              {booking.review ? (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">Bạn đã đánh giá</p>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">★ {booking.review.rating}/5</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{booking.review.comment}</p>
                  {booking.review.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {booking.review.images.map((img) => (
                        <img key={img.id} src={img.url} alt="" className="h-20 w-full rounded-xl object-cover" />
                      ))}
                    </div>
                  )}
                  {booking.review.hostReply && (
                    <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                      <p className="font-medium text-slate-800">Phản hồi từ chủ nhà</p>
                      <p className="mt-1 text-slate-600">{booking.review.hostReply}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Điểm tổng thể</span>
                    <select
                      value={reviewForm.rating}
                      onChange={(e) => setReviewForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    >
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {REVIEW_CRITERIA.map(([key, label]) => (
                      <label key={key} className="text-xs text-slate-500">
                        {label}
                        <select
                          value={reviewForm[key]}
                          onChange={(e) => setReviewForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
                        >
                          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                    rows={4}
                    placeholder="Chia sẻ trải nghiệm thực tế của bạn..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  <div>
                    <label className="inline-flex cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Thêm ảnh
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleReviewImages(e.target.files)} />
                    </label>
                    {reviewForm.imageUrls.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {reviewForm.imageUrls.map((url, index) => (
                          <button
                            key={`${url.slice(0, 24)}-${index}`}
                            type="button"
                            onClick={() => setReviewForm((f) => ({ ...f, imageUrls: f.imageUrls.filter((_, i) => i !== index) }))}
                            className="group relative overflow-hidden rounded-xl"
                          >
                            <img src={url} alt="" className="h-20 w-full object-cover" />
                            <span className="absolute inset-0 grid place-items-center bg-black/40 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">Xóa</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {reviewError && <p className="text-sm text-rose-600">{reviewError}</p>}
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={reviewSaving}
                    className="w-full rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {reviewSaving ? "Đang gửi..." : "Gửi đánh giá"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bank transfer card — show when CONFIRMED + UNPAID */}
          {isConfirmed && booking.paymentStatus === "UNPAID" && booking.payment && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-6">
              <h2 className="mb-1 text-base font-semibold text-emerald-800">Thanh toán đặt phòng</h2>
              <p className="mb-4 text-sm text-emerald-700">Vui lòng chuyển khoản theo thông tin dưới đây, sau đó nhấn xác nhận.</p>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between rounded-xl bg-white px-4 py-3">
                  <dt className="text-slate-500">Ngân hàng</dt>
                  <dd className="font-semibold text-slate-800">Vietcombank</dd>
                </div>
                <div className="flex justify-between rounded-xl bg-white px-4 py-3">
                  <dt className="text-slate-500">Số tài khoản</dt>
                  <dd className="font-mono font-semibold text-slate-800 select-all">1234 5678 9012</dd>
                </div>
                <div className="flex justify-between rounded-xl bg-white px-4 py-3">
                  <dt className="text-slate-500">Chủ tài khoản</dt>
                  <dd className="font-semibold text-slate-800">TRIPNEST</dd>
                </div>
                <div className="flex justify-between rounded-xl bg-white px-4 py-3">
                  <dt className="text-slate-500">Số tiền</dt>
                  <dd className="text-lg font-bold text-emerald-700">{formatMoney(booking.totalPrice)}</dd>
                </div>
                <div className="flex justify-between rounded-xl bg-white px-4 py-3">
                  <dt className="text-slate-500">Nội dung CK</dt>
                  <dd className="font-mono font-semibold text-slate-800 select-all">
                    {booking.payment.transferReference ?? `TN${booking.id.slice(-8).toUpperCase()}`}
                  </dd>
                </div>
              </dl>

              {actionError && (
                <p className="mt-3 text-sm text-rose-600">{actionError}</p>
              )}

              <button
                type="button"
                onClick={handleMarkTransferred}
                disabled={actionLoading === "mark-transferred"}
                className="mt-4 w-full rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading === "mark-transferred" ? "Đang xử lý..." : "Tôi đã chuyển khoản"}
              </button>
            </div>
          )}

          {/* Pending verification notice */}
          {booking.paymentStatus === "PENDING_PAYMENT" && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="font-semibold text-amber-800">Đang chờ xác nhận chuyển khoản</p>
                  <p className="mt-0.5 text-sm text-amber-700">Host sẽ xác nhận khi kiểm tra được tài khoản. Thường trong vòng 1–2 giờ.</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment summary card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Chi tiết thanh toán</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Tổng tiền</dt>
                <dd className="font-medium">{formatMoney(booking.totalPrice)}</dd>
              </div>
              {booking.payment && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Phương thức</dt>
                    <dd>{METHOD_LABEL[booking.payment.method] ?? booking.payment.method}</dd>
                  </div>
                  {booking.payment.paidAt && (
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Thanh toán lúc</dt>
                      <dd>{formatDateTime(booking.payment.paidAt)}</dd>
                    </div>
                  )}
                  {booking.payment.refundAmount !== null && (
                    <div className="flex justify-between text-sky-700">
                      <dt>Hoàn tiền</dt>
                      <dd className="font-medium">{formatMoney(booking.payment.refundAmount)}</dd>
                    </div>
                  )}
                </>
              )}
              {!booking.payment && <p className="text-slate-400">Chưa có thông tin thanh toán.</p>}
            </dl>
          </div>
        </div>
      </div>

      {/* ── Cancel modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold">Xác nhận hủy đơn</h3>
            <p className="mb-4 text-sm text-slate-500">
              {booking.refundEstimate.eligible
                ? `Bạn sẽ được hoàn ${booking.refundEstimate.percentage}%${booking.refundEstimate.amount != null ? ` (${formatMoney(booking.refundEstimate.amount)})` : ""}.`
                : "Bạn sẽ không được hoàn tiền."}
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Lý do hủy (tuỳ chọn)..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <div className="mt-4 flex gap-3">
              <button onClick={handleCancel} disabled={actionLoading === "cancel"} className="flex-1 rounded-full bg-rose-600 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50">
                {actionLoading === "cancel" ? "Đang hủy..." : "Xác nhận hủy"}
              </button>
              <button onClick={() => { setShowCancelModal(false); setCancelReason(""); }} className="flex-1 rounded-full border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modification request modal ── */}
      {showModModal && booking.property && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Yêu cầu thay đổi đơn đặt</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Check-in mới</label>
                <input
                  type="date"
                  value={modForm.newCheckIn}
                  onChange={(e) => setModForm((f) => ({ ...f, newCheckIn: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Check-out mới</label>
                <input
                  type="date"
                  value={modForm.newCheckOut}
                  onChange={(e) => setModForm((f) => ({ ...f, newCheckOut: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Số khách mới</label>
                <input
                  type="number"
                  min={1}
                  value={modForm.newNumGuests}
                  onChange={(e) => setModForm((f) => ({ ...f, newNumGuests: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            {/* Price preview */}
            {modPreviewTotal != null && (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Giá ước tính mới</span>
                  <span className="font-semibold">{formatMoney(modPreviewTotal)}</span>
                </div>
                {modPreviewDelta != null && modPreviewDelta !== 0 && (
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500">Chênh lệch</span>
                    <span className={`font-semibold ${modPreviewDelta > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {modPreviewDelta > 0 ? `+${formatMoney(modPreviewDelta)}` : `-${formatMoney(Math.abs(modPreviewDelta))}`}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button onClick={handleRequestMod} disabled={actionLoading === "mod-request"} className="flex-1 rounded-full bg-emerald-600 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50">
                {actionLoading === "mod-request" ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
              <button onClick={() => setShowModModal(false)} className="flex-1 rounded-full border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject modification modal ── */}
      {rejectModId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Từ chối thay đổi</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Lý do từ chối (tuỳ chọn)..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => handleRespondMod(rejectModId, "REJECTED")} disabled={actionLoading !== null} className="flex-1 rounded-full bg-rose-600 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50">
                Xác nhận từ chối
              </button>
              <button onClick={() => { setRejectModId(null); setRejectReason(""); }} className="flex-1 rounded-full border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
