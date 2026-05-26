import { Card } from "@/components/ui/Card";
import type { TourListItem } from "@/types/tour";
import Image from "next/image";
import Link from "next/link";

const CATEGORY_LABEL: Record<string, string> = {
  ADVENTURE: "Phiêu lưu",
  CULTURAL: "Văn hóa",
  FOOD: "Ẩm thực",
  NATURE: "Thiên nhiên",
  CITY: "Thành phố",
  BEACH: "Biển",
};

export function TourCard({ tour }: { tour: TourListItem }) {
  return (
    <Link href={`/tours/${tour.id}`} className="block">
      <Card>
        {tour.thumbnailUrl ? (
          <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl">
            <Image
              src={tour.thumbnailUrl}
              alt={tour.title}
              fill
              unoptimized
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{tour.city}</p>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {CATEGORY_LABEL[tour.category] ?? tour.category}
          </span>
        </div>
        <h3 className="mt-2 text-xl font-semibold">{tour.title}</h3>
        <p className="mt-2 text-sm text-slate-500">
          {tour.durationDays} ngày · tối đa {tour.maxGroupSize} khách
        </p>
        <p className="mt-4 font-medium">
          {tour.pricePerPerson.toLocaleString("vi-VN")} ₫ / người
        </p>
      </Card>
    </Link>
  );
}
