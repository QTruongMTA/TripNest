import Image from "next/image";
import Link from "next/link";
import { destinations } from "./home-data";
import { SectionHeading } from "./SectionHeading";

export function DestinationSection() {
  return (
    <section className="animate-fade-up mx-auto max-w-6xl px-5 md:px-6">
      <SectionHeading
        eyebrow="Điểm đến thịnh hành"
        title="Những nơi được yêu thích nhất mùa này"
        description="Bắt đầu từ các điểm đến quen thuộc trong nước, với nhiều lựa chọn chỗ nghỉ và lịch trình phù hợp cho chuyến đi ngắn ngày."
      />
      <div className="grid gap-4 md:grid-cols-4">
        {destinations.map((destination, index) => (
          <Link
            key={destination.name}
            href={destination.href}
            className={`card-lift group relative min-h-56 overflow-hidden rounded-lg ${index < 2 ? "md:col-span-2" : ""}`}
          >
            <Image
              src={destination.image}
              alt={destination.name}
              fill
              sizes={index < 2 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 100vw"}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-teal-950/90 via-teal-950/15 to-transparent" />
            <div className="absolute bottom-0 left-0 p-4 text-white">
              <p className="text-sm text-white/75">{destination.subtitle}</p>
              <h3 className="mt-1 text-xl font-semibold">{destination.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
