export default function PropertiesLoading() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 h-10 w-64 animate-pulse rounded-2xl bg-slate-200" />
      <div className="h-14 animate-pulse rounded-3xl bg-slate-200" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[290px_1fr]">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl bg-slate-200" />
          ))}
        </div>
      </div>
    </section>
  );
}
