import { quickPlans } from "./home-data";
import { SectionHeading } from "./SectionHeading";
import Link from "next/link";

export function QuickPlanSection() {
  return (
    <section className="animate-fade-up mx-auto max-w-6xl px-5 md:px-6">
      <SectionHeading eyebrow="Lên kế hoạch nhanh" title="Đi nhiều hơn, chỉ tốn ít thời gian hơn" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {quickPlans.map((item) => (
          <Link key={item.name} href={item.href} className="card-lift rounded-lg border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-950">{item.name}</p>
            <p className="mt-1 text-sm text-slate-600">{item.distance}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
