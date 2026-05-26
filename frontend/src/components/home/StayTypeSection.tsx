import Image from "next/image";
import Link from "next/link";
import { stayTypes } from "./home-data";
import { SectionHeading } from "./SectionHeading";

export function StayTypeSection() {
  return (
    <section className="animate-fade-up mx-auto max-w-6xl px-5 md:px-6">
      <SectionHeading eyebrow="Theo loại chỗ nghỉ" title="Chọn đúng phong cách lưu trú" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stayTypes.map((item) => (
          <Link key={item.name} href={item.href} className="card-lift group overflow-hidden rounded-lg bg-white shadow-sm shadow-teal-950/5">
            <div className="relative h-52">
              <Image
                src={item.image}
                alt={item.name}
                fill
                unoptimized
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-slate-950">{item.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
