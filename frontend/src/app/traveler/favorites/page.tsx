"use client";

import { useFavoriteProperties } from "@/store/favoriteProperties";
import Image from "next/image";
import Link from "next/link";

function formatCurrency(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

export default function TravelerFavoritesPage() {
  const { favorites, removeFavorite, signedIn } = useFavoriteProperties();
  const hasNoFavorites = favorites.length === 0;

  if (!signedIn) {
    return (
      <section>
        <div className="bg-emerald-950 text-white">
          <div className="mx-auto max-w-6xl px-6 py-9">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100/80">TripNest traveler</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Chỗ nghỉ yêu thích</h1>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-6 pb-6 pt-8">
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">Đăng nhập để xem danh sách đã thích</h2>
            <p className="mt-3 text-sm text-slate-600">Danh sách chỗ nghỉ yêu thích được lưu riêng theo từng tài khoản.</p>
            <Link href="/login?next=/traveler/favorites" className="mt-6 inline-flex rounded-md bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-950">
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="bg-emerald-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-9">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100/80">TripNest traveler</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Chỗ nghỉ yêu thích</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">{favorites.length} chỗ nghỉ đã lưu trong tài khoản của bạn.</p>
            </div>
            <Link href="/properties" className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-50">
              Tìm thêm chỗ nghỉ
            </Link>
          </div>
        </div>
      </div>

      <div className={`mx-auto max-w-6xl px-6 pt-8 ${hasNoFavorites ? "pb-6" : "pb-16"}`}>
        {!hasNoFavorites ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((property) => (
              <article key={property.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                <Link href={`/properties/${property.id}`} className="relative block aspect-[4/3] bg-slate-100">
                  {property.thumbnailUrl ? (
                    <Image
                      src={property.thumbnailUrl}
                      alt={property.title}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-sm text-slate-500">Chưa có ảnh</span>
                  )}
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">{property.city}, {property.country}</p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-950">{property.title}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFavorite(property.id)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50"
                      aria-label={`Bỏ yêu thích ${property.title}`}
                    >
                      ×
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{property.maxGuests} khách · {property.bedroomCount} phòng ngủ · {property.bathrooms} phòng tắm</p>
                  <p className="mt-3 font-semibold text-slate-950">{formatCurrency(property.pricePerNight)} / đêm</p>
                  <Link href={`/properties/${property.id}`} className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-950">
                    Đặt ngay
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Bạn chưa lưu chỗ nghỉ nào</h2>
            <p className="mt-2 text-sm text-slate-600">Nhấn biểu tượng tim trên các chỗ lưu trú để lưu vào trang này.</p>
            <Link href="/properties" className="mt-6 inline-flex rounded-md bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-950">
              Khám phá chỗ nghỉ
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
