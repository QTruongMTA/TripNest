import { vietnamHighlights } from "./home-data";
import { SectionHeading } from "./SectionHeading";
import Link from "next/link";

export function ExploreVietnamSection() {
  return (
    <section className="animate-fade-up mx-auto grid max-w-6xl gap-5 px-5 md:grid-cols-[1.2fr_0.8fr] md:px-6">
      <div className="card-lift rounded-lg bg-white p-5 shadow-sm shadow-teal-950/5 md:p-6">
        <SectionHeading
          eyebrow="Khám phá Việt Nam"
          title="Lên kế hoạch nhanh cho chuyến đi gần"
          description="Chọn một thành phố, xem nhanh lượng chỗ nghỉ và bắt đầu hành trình chỉ trong vài thao tác."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {vietnamHighlights.map((item) => (
            <Link key={item.name} href={`/properties?city=${encodeURIComponent(item.name)}`} className="rounded-md border border-slate-200 bg-white p-4 transition hover:border-teal-300 hover:bg-teal-50/60">
              <p className="font-semibold text-slate-950">{item.name}</p>
              <p className="mt-1 text-sm text-slate-600">{item.stays}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="card-lift relative overflow-hidden rounded-lg bg-teal-900 p-5 text-white md:p-6">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-teal-300/20 blur-3xl" />
        <p className="text-sm uppercase tracking-[0.3em] text-teal-100/70">Ưu đãi thành viên</p>
        <h3 className="mt-4 text-2xl font-semibold leading-tight">Tiết kiệm thêm cho mỗi kỳ nghỉ trong nước.</h3>
        <p className="mt-4 text-sm leading-6 text-white/75">
          Đăng nhập để lưu điểm đến yêu thích, nhận ưu đãi giới hạn và theo dõi lịch trình của bạn ở một nơi.
        </p>
        <button className="mt-6 rounded-md bg-white px-5 py-3 text-sm font-semibold text-teal-950 transition hover:bg-teal-50">
          Khám phá ưu đãi
        </button>
      </div>
    </section>
  );
}
