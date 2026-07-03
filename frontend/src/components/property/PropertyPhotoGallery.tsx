"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type PropertyPhoto = {
  id: string;
  url: string;
  isPrimary: boolean;
};

type PropertyPhotoGalleryProps = {
  title: string;
  images: PropertyPhoto[];
  ratingAverage: number | null;
  ratingCount: number;
};

const recentReviews = [
  {
    name: "Nhiên",
    country: "Việt Nam",
    text: "Chỗ nghỉ sạch sẽ, tiện nghi và vị trí thuận tiện. Host hỗ trợ nhanh, sẽ quay lại lần sau.",
  },
  {
    name: "Hannah",
    country: "Vương Quốc Anh",
    text: "Không gian yên tĩnh, ảnh thực tế rõ ràng và khu vực xung quanh dễ di chuyển.",
  },
  {
    name: "Lê",
    country: "Canada",
    text: "Rất đáng tiền. Phòng rộng rãi, dịch vụ ổn và phù hợp cho chuyến đi ngắn ngày.",
  },
  {
    name: "Minh",
    country: "Việt Nam",
    text: "Gần trung tâm, tiện ích cơ bản đầy đủ và thủ tục đặt phòng đơn giản.",
  },
];

function getRatingLabel(score: number | null) {
  if (!score) return "Chỗ nghỉ mới";
  if (score >= 4.7) return "Tuyệt hảo";
  if (score >= 4.3) return "Rất tốt";
  if (score >= 3.8) return "Tốt";
  return "Đang cải thiện";
}

export function PropertyPhotoGallery({
  title,
  images,
  ratingAverage,
  ratingCount,
}: PropertyPhotoGalleryProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"grid" | "single">("grid");
  const [activeIndex, setActiveIndex] = useState(0);
  const visibleImages = useMemo(() => images.slice(0, 8), [images]);
  const remainingCount = Math.max(0, images.length - visibleImages.length);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (mode === "single" && event.key === "ArrowRight") {
        setActiveIndex((index) => Math.min(images.length - 1, index + 1));
      }
      if (mode === "single" && event.key === "ArrowLeft") {
        setActiveIndex((index) => Math.max(0, index - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length, mode, open]);

  function openLibrary() {
    setMode("grid");
    setActiveIndex(0);
    setOpen(true);
  }

  function openSingle(index: number) {
    setMode("single");
    setActiveIndex(index);
    setOpen(true);
  }

  if (images.length === 0) {
    return (
      <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
        Host chưa tải ảnh thật cho chỗ nghỉ này.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-2 overflow-hidden rounded-xl md:grid-cols-[1.18fr_0.82fr]">
        <button
          type="button"
          onClick={() => openSingle(0)}
          className="relative min-h-[320px] bg-slate-100 text-left md:min-h-[430px]"
        >
          <Image
            src={visibleImages[0]?.url ?? images[0].url}
            alt={title}
            fill
            unoptimized
            priority
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover transition duration-300 hover:scale-[1.02]"
          />
        </button>

        <div className="grid grid-cols-2 gap-2">
          {visibleImages.slice(1, 8).map((image, index) => {
            const realIndex = index + 1;
            const isLastTile = realIndex === visibleImages.length - 1 && remainingCount > 0;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => (isLastTile ? openLibrary() : openSingle(realIndex))}
                className="relative min-h-[118px] overflow-hidden bg-slate-100 text-left md:min-h-0"
              >
                <Image
                  src={image.url}
                  alt={`${title} ${realIndex + 1}`}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 21vw, 50vw"
                  className={`object-cover transition duration-300 hover:scale-[1.03] ${isLastTile ? "blur-[1.5px]" : ""}`}
                />
                {isLastTile ? (
                  <span className="absolute inset-0 grid place-items-center bg-slate-950/45 text-lg font-semibold text-white underline decoration-2 underline-offset-4">
                    +{remainingCount} ảnh
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {open ? (
        <GalleryModal
          title={title}
          images={images}
          mode={mode}
          activeIndex={activeIndex}
          ratingAverage={ratingAverage}
          ratingCount={ratingCount}
          onClose={() => setOpen(false)}
          onModeChange={setMode}
          onActiveIndexChange={setActiveIndex}
        />
      ) : null}
    </>
  );
}

function GalleryModal({
  title,
  images,
  mode,
  activeIndex,
  ratingAverage,
  ratingCount,
  onClose,
  onModeChange,
  onActiveIndexChange,
}: {
  title: string;
  images: PropertyPhoto[];
  mode: "grid" | "single";
  activeIndex: number;
  ratingAverage: number | null;
  ratingCount: number;
  onClose: () => void;
  onModeChange: (mode: "grid" | "single") => void;
  onActiveIndexChange: (index: number | ((index: number) => number)) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/55 p-2 text-slate-950 sm:p-5">
      <div className="mx-auto flex h-full max-w-[1880px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="grid h-16 shrink-0 grid-cols-[180px_minmax(0,1fr)_220px] items-center border-b border-slate-200 px-5">
          <div>
            {mode === "single" ? (
              <button
                type="button"
                onClick={() => onModeChange("grid")}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"
              >
                <span className="text-3xl leading-none">‹</span>
                Thư viện ảnh
              </button>
            ) : null}
          </div>
          <div className="flex items-center justify-center gap-4">
            <h2 className="truncate text-center text-lg font-semibold">{title}</h2>
            <a href="#rooms" onClick={onClose} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
              Đặt ngay
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="justify-self-end text-sm font-semibold text-slate-950"
          >
            Đóng <span className="ml-3 text-3xl font-light align-middle">×</span>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_350px]">
          {mode === "grid" ? (
            <PhotoGrid images={images} title={title} onOpenImage={(index) => {
              onActiveIndexChange(index);
              onModeChange("single");
            }} />
          ) : (
            <SinglePhoto
              images={images}
              title={title}
              activeIndex={activeIndex}
              onActiveIndexChange={onActiveIndexChange}
            />
          )}

          <ReviewSidebar ratingAverage={ratingAverage} ratingCount={ratingCount} />
        </div>
      </div>
    </div>
  );
}

function PhotoGrid({
  images,
  title,
  onOpenImage,
}: {
  images: PropertyPhoto[];
  title: string;
  onOpenImage: (index: number) => void;
}) {
  return (
    <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => onOpenImage(index)}
            className={`relative aspect-[1.42] overflow-hidden rounded-lg bg-slate-100 text-left ${index === 0 ? "ring-2 ring-blue-700 ring-offset-2" : ""}`}
          >
            <Image
              src={image.url}
              alt={`${title} ${index + 1}`}
              fill
              unoptimized
              sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-300 hover:scale-[1.03]"
            />
            {image.isPrimary || index === 0 ? (
              <span className="absolute left-3 top-3 rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white">
                Ảnh mới
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function SinglePhoto({
  images,
  title,
  activeIndex,
  onActiveIndexChange,
}: {
  images: PropertyPhoto[];
  title: string;
  activeIndex: number;
  onActiveIndexChange: (index: number | ((index: number) => number)) => void;
}) {
  return (
    <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] bg-white">
      <div className="relative min-h-0 p-6">
        <div className="relative mx-auto h-full max-w-5xl overflow-hidden rounded-lg bg-slate-50">
          <Image
            src={images[activeIndex].url}
            alt={`${title} ${activeIndex + 1}`}
            fill
            unoptimized
            sizes="(min-width: 1024px) 70vw, 100vw"
            className="object-contain"
          />
        </div>
        <button
          type="button"
          onClick={() => onActiveIndexChange((index) => Math.max(0, index - 1))}
          disabled={activeIndex === 0}
          className="absolute left-6 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-3xl text-slate-950 shadow-lg disabled:opacity-30"
          aria-label="Ảnh trước"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => onActiveIndexChange((index) => Math.min(images.length - 1, index + 1))}
          disabled={activeIndex === images.length - 1}
          className="absolute right-6 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-3xl text-slate-950 shadow-lg disabled:opacity-30"
          aria-label="Ảnh sau"
        >
          ›
        </button>
      </div>

      <div className="border-t border-slate-200 px-5 py-3">
        <p className="text-center text-sm font-semibold text-slate-800">
          {activeIndex + 1} / {images.length}
        </p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => onActiveIndexChange(index)}
              className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-md border-2 bg-slate-100 ${index === activeIndex ? "border-blue-700" : "border-transparent opacity-70"}`}
            >
              <Image src={image.url} alt="" fill unoptimized sizes="112px" className="object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewSidebar({
  ratingAverage,
  ratingCount,
}: {
  ratingAverage: number | null;
  ratingCount: number;
}) {
  const score = ratingAverage ?? 0;
  return (
    <aside className="hidden min-h-0 border-l border-slate-200 bg-white lg:grid lg:grid-rows-[auto_minmax(0,1fr)]">
      <div className="flex items-center gap-3 border-b border-slate-200 p-5 shadow-sm">
        <span className="rounded-md bg-blue-800 px-2.5 py-2 text-xl font-semibold text-white">
          {score ? score.toFixed(1) : "Mới"}
        </span>
        <div>
          <p className="font-semibold text-slate-950">{getRatingLabel(ratingAverage)}</p>
          <p className="text-sm text-slate-500">
            {ratingCount ? `${ratingCount} đánh giá` : "Chưa có đánh giá"}
          </p>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto p-5">
        <p className="font-semibold leading-6 text-slate-950">
          Đọc xem khách yêu thích điều gì nhất:
        </p>
        <div className="mt-6 divide-y divide-slate-200">
          {recentReviews.map((review) => (
            <article key={`${review.name}-${review.country}`} className="py-5 first:pt-0">
              <p className="text-sm leading-6 text-slate-800">“{review.text}”</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-600 text-sm font-semibold text-white">
                  {review.name[0]}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{review.name}</p>
                  <p className="text-xs text-slate-500">{review.country}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}
