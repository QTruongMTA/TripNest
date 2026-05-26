import { Card } from "@/components/ui/Card";
import type { PropertyListItem } from "@/types/property";
import Image from "next/image";
import Link from "next/link";

export function PropertyCard({ property, nights }: { property: PropertyListItem; nights?: number | null }) {
  const total = nights ? property.pricePerNight * nights + (property.cleaningFee ?? 0) : null;

  return (
    <Link href={`/properties/${property.id}`} className="block">
      <Card>
        {property.thumbnailUrl ? (
          <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl">
            <Image
              src={property.thumbnailUrl}
              alt={property.title}
              fill
              unoptimized
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
          <p>{property.city}</p>
          <p>{property.rating.average ? `★ ${property.rating.average} (${property.rating.count})` : "Chưa có đánh giá"}</p>
        </div>
        <h3 className="mt-2 text-xl font-semibold">{property.title}</h3>
        <p className="mt-2 text-sm text-slate-500">{property.maxGuests} khách · {property.bedroomCount} phòng ngủ · {property.bathrooms} phòng tắm</p>
        {property.amenityNames?.length ? <p className="mt-3 line-clamp-1 text-sm text-teal-700">{property.amenityNames.slice(0, 3).join(" · ")}</p> : null}
        <div className="mt-4">
          {total ? (
            <>
              <p className="text-sm text-slate-500">Tổng cho {nights} đêm</p>
              <p className="text-xl font-semibold text-slate-950">{total.toLocaleString("vi-VN")} ₫</p>
              <p className="text-sm text-slate-500">{property.pricePerNight.toLocaleString("vi-VN")} ₫ / đêm</p>
            </>
          ) : (
            <p className="font-medium">{property.pricePerNight.toLocaleString("vi-VN")} ₫ / đêm</p>
          )}
        </div>
      </Card>
    </Link>
  );
}
