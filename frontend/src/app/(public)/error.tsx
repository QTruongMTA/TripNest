"use client";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl">⚠️</p>
      <h2 className="mt-4 text-2xl font-semibold text-slate-900">Đã xảy ra lỗi</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        {error.message ?? "Có sự cố khi tải trang. Hãy thử lại hoặc kiểm tra kết nối mạng."}
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
