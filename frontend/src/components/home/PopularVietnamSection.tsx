import { popularLinks } from "./home-data";
import { SectionHeading } from "./SectionHeading";

export function PopularVietnamSection() {
  return (
    <section className="animate-fade-up mx-auto max-w-6xl px-5 md:px-6">
      <SectionHeading eyebrow="Phổ biến với du khách Việt Nam" title="Tìm nhanh theo nhu cầu thường gặp" />
      <div className="grid gap-x-8 gap-y-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
        {popularLinks.map((item) => (
          <a key={item} href="#" className="text-sm text-slate-700 transition hover:text-teal-800 hover:underline">
            {item}
          </a>
        ))}
      </div>
    </section>
  );
}
