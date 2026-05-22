"use client";

export default function PropertiesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 text-center">
      <p className="text-4xl">😕</p>
      <h2 className="mt-4 text-2xl font-semibold text-slate-900">Không tải được danh sách chỗ ở</h2>
      <p className="mt-3 text-sm text-slate-500">
        {error.message ?? "Máy chủ chưa sẵn sàng hoặc kết nối bị gián đoạn. Vui lòng thử lại."}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-teal-800 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-950 transition"
      >
        Thử lại
      </button>
    </section>
  );
}
