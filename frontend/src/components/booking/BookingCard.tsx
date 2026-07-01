import Image from "next/image";
import Link from "next/link";

export type TravelerBooking = {
  id: string;
  type: "PROPERTY";
  status: string;
  paymentStatus: string;
  checkIn: string | null;
  checkOut: string | null;
  numGuests: number;
  totalPrice: number;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  item: {
    id: string;
    title: string;
    city: string;
    country: string;
    thumbnailUrl: string | null;
  } | null;
};

type StatusConfig = { label: string; className: string };

const STATUS_CONFIG: Record<string, StatusConfig> = {
  PENDING:            { label: "Chờ xác nhận",   className: "bg-amber-50 text-amber-700" },
  CONFIRMED:          { label: "Đã xác nhận",    className: "bg-emerald-50 text-emerald-700" },
  COMPLETED:          { label: "Hoàn thành",      className: "bg-sky-50 text-sky-700" },
  CANCELLED:          { label: "Đã hủy",          className: "bg-slate-100 text-slate-500" },
  CANCELLED_BY_GUEST: { label: "Bạn đã hủy",     className: "bg-slate-100 text-slate-500" },
  CANCELLED_BY_HOST:  { label: "Chủ nhà đã hủy", className: "bg-rose-50 text-rose-600" },
  EXPIRED:            { label: "Hết hạn",         className: "bg-slate-100 text-slate-400" },
  NO_SHOW:            { label: "Không đến",       className: "bg-rose-50 text-rose-600" },
};

export function BookingCard({
  booking,
  onCancel,
  cancelling,
}: {
  booking: TravelerBooking;
  onCancel?: (id: string) => void;
  cancelling?: boolean;
}) {
  const statusCfg = STATUS_CONFIG[booking.status] ?? { label: booking.status, className: "bg-slate-100 text-slate-600" };
  const canCancel = onCancel && (booking.status === "PENDING" || booking.status === "CONFIRMED");

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="grid md:grid-cols-[220px_1fr]">
        {booking.item?.thumbnailUrl ? (
          <div className="relative min-h-[180px]">
            <Image
              src={booking.item.thumbnailUrl}
              alt={booking.item.title}
              fill
              unoptimized
              sizes="(min-width: 768px) 220px, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="min-h-[180px] bg-slate-100" />
        )}

        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-emerald-700">
                Chỗ ở
              </p>
              <h2 className="mt-1 text-2xl font-semibold">
                {booking.item?.title ?? "Booking"}
              </h2>
              <p className="mt-1 text-slate-500">
                {booking.item?.city}, {booking.item?.country}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-4">
            <div>
              <p className="text-slate-400">Nhận phòng</p>
              <p className="mt-1 font-medium text-slate-800">
                {booking.checkIn ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Trả phòng</p>
              <p className="mt-1 font-medium text-slate-800">
                {booking.checkOut ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Số khách</p>
              <p className="mt-1 font-medium text-slate-800">
                {booking.numGuests}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Tổng tiền</p>
              <p className="mt-1 font-medium text-slate-800">
                {booking.totalPrice.toLocaleString("vi-VN")} ₫
              </p>
            </div>
          </div>

          {booking.cancelledReason ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Lý do hủy: {booking.cancelledReason}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {canCancel ? (
              <button
                type="button"
                onClick={() => onCancel(booking.id)}
                disabled={cancelling}
                className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
              >
                {cancelling ? "Đang hủy..." : "Hủy đơn"}
              </button>
            ) : null}
            <Link
              href={`/traveler/bookings/${booking.id}`}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Xem chi tiết →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
