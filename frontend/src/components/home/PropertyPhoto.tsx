import Image from "next/image";

export function PropertyPhoto({
  url,
  alt,
  sizes,
  className = "object-cover",
}: {
  url: string | null;
  alt: string;
  sizes: string;
  className?: string;
}) {
  if (!url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-teal-50 via-white to-amber-50 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-xl font-semibold text-teal-800 shadow-sm">
          {alt.trim().charAt(0).toUpperCase() || "T"}
        </span>
        <span className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
          Chưa có ảnh
        </span>
      </div>
    );
  }

  return <Image src={url} alt={alt} fill unoptimized sizes={sizes} className={className} />;
}
