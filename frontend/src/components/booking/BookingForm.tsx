"use client";

import { Button } from "@/components/ui/Button";
import { getAccessToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type RatePlan = {
  id: string;
  name: string;
  type: string;
  priceAdjustmentType: string;
  priceAdjustmentValue: number;
  cancellationPolicy: string | null;
  cancellationFreeDays: number | null;
  minStay: number | null;
  maxStay: number | null;
  breakfastIncluded: boolean;
};

type Promotion = {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minOrderValue: number | null;
  maxUses: number | null;
  usedCount: number;
  endDate: string;
};

type BookingFormProps = {
  propertyId: string;
  pricePerNight?: number;
  cleaningFee?: number | null;
  maxGuests?: number;
  ratePlans?: RatePlan[];
  promotions?: Promotion[];
};

const CANCEL_LABELS: Record<string, string> = {
  FLEXIBLE: "Linh hoạt",
  MODERATE: "Trung bình",
  STRICT: "Nghiêm ngặt",
  NON_REFUNDABLE: "Không hoàn tiền",
};

function applyAdjustment(base: number, type: string, value: number): number {
  if (type === "PERCENT") return base * (1 + value / 100);
  if (type === "FIXED") return base + value;
  return base;
}

function formatMoney(amount: number | null | undefined) {
  if (amount == null) return "—";
  return `${Math.round(amount).toLocaleString("vi-VN")} ₫`;
}

function adjustmentLabel(plan: RatePlan | null) {
  if (!plan || plan.priceAdjustmentType === "NONE" || plan.priceAdjustmentValue === 0) return null;
  if (plan.priceAdjustmentType === "PERCENT") {
    return `${plan.priceAdjustmentValue > 0 ? "+" : ""}${plan.priceAdjustmentValue}%`;
  }
  return `${plan.priceAdjustmentValue > 0 ? "+" : ""}${formatMoney(plan.priceAdjustmentValue)} / đêm`;
}

export function BookingForm({
  propertyId,
  pricePerNight,
  cleaningFee,
  maxGuests,
  ratePlans = [],
  promotions = [],
}: BookingFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [promotionCode, setPromotionCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [availabilityOk, setAvailabilityOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);
    return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  const selectedPlan = ratePlans.find((p) => p.id === selectedPlanId) ?? null;
  const stayRestrictionMessage = useMemo(() => {
    if (!selectedPlan || nights <= 0) return null;
    if (selectedPlan.minStay && nights < selectedPlan.minStay) {
      return `Gói này yêu cầu tối thiểu ${selectedPlan.minStay} đêm.`;
    }
    if (selectedPlan.maxStay && nights > selectedPlan.maxStay) {
      return `Gói này chỉ cho phép tối đa ${selectedPlan.maxStay} đêm.`;
    }
    return null;
  }, [nights, selectedPlan]);

  // Adjusted nightly price based on selected rate plan
  const adjustedNightPrice = useMemo(() => {
    if (!pricePerNight) return null;
    if (!selectedPlan || selectedPlan.priceAdjustmentType === "NONE") return pricePerNight;
    return Math.max(0, applyAdjustment(pricePerNight, selectedPlan.priceAdjustmentType, selectedPlan.priceAdjustmentValue));
  }, [pricePerNight, selectedPlan]);

  const totalPreview =
    adjustedNightPrice !== null && nights > 0
      ? nights * adjustedNightPrice + (cleaningFee ?? 0)
      : null;

  const selectedPromotion = promotions.find((promo) => promo.code.toUpperCase() === promotionCode.trim().toUpperCase()) ?? null;
  const promotionDiscount = useMemo(() => {
    if (!selectedPromotion || totalPreview === null) return 0;
    if (selectedPromotion.minOrderValue !== null && totalPreview < selectedPromotion.minOrderValue) return 0;
    const raw = selectedPromotion.discountType === "PERCENTAGE"
      ? Math.round(totalPreview * (selectedPromotion.discountValue / 100))
      : selectedPromotion.discountValue;
    return Math.min(Math.max(0, raw), totalPreview);
  }, [selectedPromotion, totalPreview]);
  const finalPreview = totalPreview !== null ? Math.max(0, totalPreview - promotionDiscount) : null;

  async function handleCheckAvailability() {
    if (!checkIn || !checkOut) {
      setMessage("Vui lòng chọn ngày nhận và trả phòng.");
      setAvailabilityOk(false);
      return;
    }
    if (stayRestrictionMessage) {
      setMessage(stayRestrictionMessage);
      setAvailabilityOk(false);
      return;
    }

    setLoading(true);
    setMessage(null);
    setAvailabilityOk(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/availability/properties/${propertyId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
      );
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error?.message ?? "Không thể kiểm tra phòng trống.");
        return;
      }

      setAvailabilityOk(payload.data.available);
      setMessage(
        payload.data.available
          ? "Phòng còn trống cho khoảng thời gian này."
          : "Phòng không còn trống cho lựa chọn hiện tại."
      );
    } catch {
      setMessage("Không thể kết nối để kiểm tra phòng trống.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBooking() {
    const accessToken = getAccessToken();

    if (!accessToken) {
      const next = window.location.pathname;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    if (!checkIn || !checkOut) {
      setMessage("Vui lòng chọn ngày trước khi đặt phòng.");
      return;
    }
    if (stayRestrictionMessage) {
      setMessage(stayRestrictionMessage);
      return;
    }

    setBookingLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/bookings/property`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            propertyId,
            checkIn,
            checkOut,
            guests,
            ...(selectedPlanId ? { ratePlanId: selectedPlanId } : {}),
            ...(promotionCode.trim() ? { promotionCode: promotionCode.trim() } : {}),
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error?.message ?? "Không thể tạo booking.");
        return;
      }

      setMessage(
        `Đặt phòng thành công. Mã booking: ${payload.data.id.slice(-6).toUpperCase()}`
      );
      setAvailabilityOk(false);
    } catch {
      setMessage("Không thể kết nối để tạo booking.");
    } finally {
      setBookingLoading(false);
    }
  }

  const hasPriceDiff =
    selectedPlan &&
    selectedPlan.priceAdjustmentType !== "NONE" &&
    selectedPlan.priceAdjustmentValue !== 0;
  const canSubmit = availabilityOk && !bookingLoading && !stayRestrictionMessage;

  return (
    <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,118,110,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Giá từ</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatMoney(pricePerNight)}
            <span className="text-base font-normal text-slate-500"> / đêm</span>
          </p>
        </div>
        {cleaningFee ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Phí dọn dẹp {formatMoney(cleaningFee)}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3">
        <label className="grid gap-2 text-sm">
          <span className="text-slate-500">Nhận phòng</span>
          <input
            type="date"
            value={checkIn}
            min={today}
            onChange={(event) => {
              const val = event.target.value;
              setCheckIn(val);
              if (checkOut && checkOut <= val) setCheckOut("");
              setAvailabilityOk(false);
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-slate-500">Trả phòng</span>
          <input
            type="date"
            value={checkOut}
            min={checkIn || today}
            onChange={(event) => {
              setCheckOut(event.target.value);
              setAvailabilityOk(false);
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-slate-500">Số khách</span>
          <input
            type="number"
            min={1}
            max={maxGuests}
            value={guests}
            onChange={(event) => setGuests(Number(event.target.value))}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
      </div>

      {ratePlans.length > 0 && (
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">Chọn gói giá</p>
            {selectedPlan ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedPlanId(null);
                  setAvailabilityOk(false);
                }}
                className="text-xs font-medium text-slate-500 hover:text-teal-700"
              >
                Dùng giá tiêu chuẩn
              </button>
            ) : null}
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setSelectedPlanId(null);
                setAvailabilityOk(false);
              }}
              className={`w-full rounded-xl border bg-white p-3 text-left transition ${
                selectedPlanId === null
                  ? "border-teal-400 ring-1 ring-teal-300"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Giá tiêu chuẩn</p>
                  <p className="mt-0.5 text-xs text-slate-500">Dùng chính sách mặc định của chỗ nghỉ</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-slate-700">{formatMoney(pricePerNight)}/đêm</p>
              </div>
            </button>
            {ratePlans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const adjPrice =
                plan.priceAdjustmentType !== "NONE" && pricePerNight
                  ? Math.max(0, applyAdjustment(pricePerNight, plan.priceAdjustmentType, plan.priceAdjustmentValue))
                  : null;
              const badge = adjustmentLabel(plan);
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlanId(isSelected ? null : plan.id);
                    setAvailabilityOk(false);
                  }}
                  className={`w-full rounded-xl border bg-white p-3 text-left transition ${
                    isSelected
                      ? "border-teal-400 bg-teal-50 ring-1 ring-teal-300"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-800">{plan.name}</span>
                        {badge && (
                          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">{badge}</span>
                        )}
                        {plan.breakfastIncluded && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Bữa sáng</span>
                        )}
                      </div>
                      <div className="mt-0.5 space-y-0.5 text-xs text-slate-500">
                        {plan.cancellationPolicy && (
                          <p>Huỷ: {CANCEL_LABELS[plan.cancellationPolicy] ?? plan.cancellationPolicy}</p>
                        )}
                        {plan.minStay && <p>Tối thiểu {plan.minStay} đêm</p>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {adjPrice !== null ? (
                        <>
                          <p className="text-sm font-semibold text-teal-700">
                            {formatMoney(adjPrice)}/đêm
                          </p>
                          <p className="text-xs text-slate-400 line-through">
                            {formatMoney(pricePerNight)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-slate-600">
                          {formatMoney(pricePerNight)}/đêm
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {promotions.length > 0 && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-amber-900">Ưu đãi của chỗ nghỉ</p>
            <span className="text-xs font-medium text-amber-700">{promotions.length} mã</span>
          </div>
          <div className="space-y-2">
            {promotions.slice(0, 3).map((promo) => (
              <button
                key={promo.id}
                type="button"
                onClick={() => {
                  setPromotionCode(promo.code);
                  setAvailabilityOk(false);
                }}
                className={`w-full rounded-xl border bg-white px-3 py-2 text-left transition ${
                  promotionCode.trim().toUpperCase() === promo.code
                    ? "border-amber-400 ring-1 ring-amber-300"
                    : "border-amber-100 hover:border-amber-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-amber-900">{promo.code}</p>
                    <p className="text-xs text-amber-700">
                      {promo.discountType === "PERCENTAGE" ? `Giảm ${promo.discountValue}%` : `Giảm ${formatMoney(promo.discountValue)}`}
                      {promo.minOrderValue ? ` · đơn từ ${formatMoney(promo.minOrderValue)}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Áp dụng</span>
                </div>
              </button>
            ))}
          </div>
          <input
            value={promotionCode}
            onChange={(event) => {
              setPromotionCode(event.target.value.toUpperCase());
              setAvailabilityOk(false);
            }}
            placeholder="Nhập mã ưu đãi"
            className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-300"
          />
          {selectedPromotion && selectedPromotion.minOrderValue !== null && totalPreview !== null && totalPreview < selectedPromotion.minOrderValue && (
            <p className="mt-2 text-xs text-amber-700">Mã này cần đơn tối thiểu {formatMoney(selectedPromotion.minOrderValue)}.</p>
          )}
        </div>
      )}

      {totalPreview !== null ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>
              {formatMoney(adjustedNightPrice)} × {nights} đêm
              {hasPriceDiff && pricePerNight && (
                <span className="ml-1 text-xs text-teal-600">
                  ({selectedPlan!.priceAdjustmentType === "PERCENT"
                    ? `${selectedPlan!.priceAdjustmentValue >= 0 ? "+" : ""}${selectedPlan!.priceAdjustmentValue}%`
                    : `${selectedPlan!.priceAdjustmentValue >= 0 ? "+" : ""}${formatMoney(selectedPlan!.priceAdjustmentValue)}`})
                </span>
              )}
            </span>
            <span>{formatMoney(nights * (adjustedNightPrice ?? 0))}</span>
          </div>
          <div className="mt-2 flex justify-between text-slate-600">
            <span>Phí dọn dẹp</span>
            <span>{formatMoney(cleaningFee ?? 0)}</span>
          </div>
          {promotionDiscount > 0 && (
            <div className="mt-2 flex justify-between text-emerald-700">
              <span>Ưu đãi {selectedPromotion?.code}</span>
              <span>-{formatMoney(promotionDiscount)}</span>
            </div>
          )}
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-semibold">
            <span>Tổng cộng</span>
            <span>{formatMoney(finalPreview)}</span>
          </div>
        </div>
      ) : null}

      {stayRestrictionMessage ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {stayRestrictionMessage}
        </p>
      ) : null}

      <Button
        type="button"
        onClick={handleCheckAvailability}
        className="mt-5 w-full py-3"
      >
        {loading ? "Đang kiểm tra..." : "Kiểm tra phòng trống"}
      </Button>

      <Button
        type="button"
        onClick={handleCreateBooking}
        className="mt-3 w-full py-3"
        disabled={!canSubmit}
      >
        {bookingLoading ? "Đang tạo booking..." : "Đặt phòng"}
      </Button>

      {message ? (
        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {message}
        </p>
      ) : null}
    </aside>
  );
}
