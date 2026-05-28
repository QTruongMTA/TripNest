import { FilterPanel } from "@/components/search/FilterPanel";

export default function SearchPage() {
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[280px_1fr]">
      <FilterPanel />
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Kết quả tìm kiếm</h1>
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
          Chưa có chỗ nghỉ nào để hiển thị.
        </div>
      </div>
    </section>
  );
}
