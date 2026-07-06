"use client";

import type { FavoriteProperty } from "@/store/favoriteProperties";
import { useFavoriteProperties } from "@/store/favoriteProperties";
import { useState } from "react";

type FavoritePropertyButtonProps = {
  property: FavoriteProperty;
  className?: string;
  showLabel?: boolean;
};

export function FavoritePropertyButton({ property, className = "", showLabel = false }: FavoritePropertyButtonProps) {
  const { favoriteIds, toggleFavorite } = useFavoriteProperties();
  const [message, setMessage] = useState("");
  const active = favoriteIds.has(property.id);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const result = toggleFavorite(property);
    const nextMessage = result.ok
      ? result.favorited
        ? "Đã lưu vào Chỗ nghỉ yêu thích."
        : "Đã bỏ khỏi Chỗ nghỉ yêu thích."
      : result.message ?? "Không thể lưu chỗ nghỉ yêu thích.";
    setMessage(nextMessage);
    window.setTimeout(() => setMessage((current) => current === nextMessage ? "" : current), 2600);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={active ? "Bỏ khỏi chỗ nghỉ yêu thích" : "Lưu chỗ nghỉ yêu thích"}
        className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-2 text-sm font-semibold shadow-lg shadow-slate-900/15 transition hover:bg-white ${active ? "text-red-600" : "text-slate-800"} ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill={active ? "#dc2626" : "none"} stroke={active ? "#dc2626" : "currentColor"} strokeWidth="1.9">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {showLabel ? <span>{active ? "Đã thích" : "Yêu thích"}</span> : null}
      </button>
      {message ? (
        <p role="status" className="fixed right-4 top-4 z-[80] max-w-sm rounded-lg border border-emerald-900/15 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 shadow-xl shadow-slate-900/15">
          {message}
        </p>
      ) : null}
    </>
  );
}
