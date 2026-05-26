import { BookingForm } from "@/components/booking/BookingForm";
import type { TourDetail } from "@/types/tour";
import Image from "next/image";
import { notFound } from "next/navigation";

const CATEGORY_LABEL: Record<string, string> = {
  ADVENTURE: "Phiêu lưu",
  CULTURAL: "Văn hóa",
  FOOD: "Ẩm thực",
  NATURE: "Thiên nhiên",
  CITY: "Thành phố",
  BEACH: "Biển",
};

type TourDetailResponse = {
  data: TourDetail;
};

async function getTour(id: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/tours/${id}`,
    { cache: "no-store" }
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Không thể tải chi tiết tour");
  }

  return ((await response.json()) as TourDetailResponse).data;
}

export default async function TourDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const tour = await getTour(params.id);

  if (!tour) {
    notFound();
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="flex items-center gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">
            Tour · {CATEGORY_LABEL[tour.category] ?? tour.category}
          </p>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {tour.durationDays} ngày
          </span>
        </div>

        <h1 className="mt-3 text-4xl font-semibold">{tour.title}</h1>
        <p className="mt-2 text-slate-500">
          {tour.city}, {tour.country}
        </p>

        {tour.images[0] ? (
          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-3xl">
            <Image
              src={tour.images[0].url}
              alt={tour.title}
              fill
              unoptimized
              sizes="(min-width: 1024px) 760px, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="mt-8">
          <h2 className="text-xl font-semibold">Giới thiệu tour</h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            {tour.description}
          </p>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold">Lịch trình</h2>
          <ol className="mt-4 space-y-4">
            {tour.itinerary.map((day) => (
              <li key={day.id} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                  {day.dayNumber}
                </span>
                <div>
                  <p className="font-medium">{day.title}</p>
                  <p className="mt-1 text-slate-600">{day.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Bao gồm</h2>
            <ul className="mt-3 space-y-2">
              {tour.inclusions.included.map((item) => (
                <li key={item} className="text-slate-600">
                  ✓ {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Không bao gồm</h2>
            <ul className="mt-3 space-y-2">
              {tour.inclusions.excluded.map((item) => (
                <li key={item} className="text-slate-600">
                  — {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold">Lịch khởi hành</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {tour.availability.map((slot) => (
              <span
                key={slot.date}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
              >
                {slot.date} · còn {slot.slotsRemaining} chỗ
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <BookingForm propertyId={tour.id} />
        <p className="mt-3 text-center text-sm text-slate-400">
          Nhóm tối đa {tour.maxGroupSize} người
          {tour.cancellationHours
            ? ` · Miễn phí hủy trước ${tour.cancellationHours}h`
            : ""}
        </p>
      </div>
    </section>
  );
}
