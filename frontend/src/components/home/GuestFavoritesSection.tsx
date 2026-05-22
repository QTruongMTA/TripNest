import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "./SectionHeading";

type PropertyItem = {
  id: string;
  title: string;
  city: string;
  pricePerNight: number;
  thumbnailUrl: string | null;
  rating: { average: number | null; count: number };
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800";

function formatVND(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

export function GuestFavoritesSection({ properties }: { properties: PropertyItem[] }) {
  if (properties.length === 0) return null;

  return (
    <section className="animate-fade-up mx-auto max-w-6xl px-5 md:px-6">
      <SectionHeading eyebrow="Nhà ở khách yêu thích" title="Những nơi được đặt nhiều gần đây" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {properties.map((property) => (
          <Link key={property.id} href={`/properties/${property.id}`}>
            <article className="card-lift group overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="relative h-48">
                <Image
                  src={property.thumbnailUrl ?? FALLBACK_IMAGE}
                  alt={property.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Khách chọn nhiều
                  </span>
                  <button className="text-lg text-slate-300 transition hover:text-rose-500" aria-label={`Lưu ${property.title}`}>
                    ♥
                  </button>
                </div>
                <h3 className="font-semibold text-slate-950">{property.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{property.city}</p>
                <p className="mt-3 text-sm text-slate-600">
                  Từ <span className="font-semibold text-slate-950">{formatVND(property.pricePerNight)}</span> / đêm
                </p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
