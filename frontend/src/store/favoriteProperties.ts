"use client";

import { useAuthStore } from "@/store/authStore";
import { useEffect, useMemo, useState } from "react";

export type FavoriteProperty = {
  id: string;
  title: string;
  city: string;
  country: string;
  pricePerNight: number;
  thumbnailUrl: string | null;
  maxGuests: number;
  bedroomCount: number;
  bathrooms: number;
  rating?: {
    average: number | null;
    count: number;
  };
};

function getFavoriteKey(userId?: string | null) {
  return `tripnest:favorites:${userId ?? "guest"}`;
}

function readFavorites(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as FavoriteProperty[] : [];
  } catch {
    return [];
  }
}

function writeFavorites(key: string, favorites: FavoriteProperty[]) {
  window.localStorage.setItem(key, JSON.stringify(favorites));
  window.dispatchEvent(new CustomEvent("tripnest:favorites-changed", { detail: { key } }));
}

export function useFavoriteProperties() {
  const user = useAuthStore((state) => state.user);
  const key = useMemo(() => getFavoriteKey(user?.id ?? user?.email), [user?.email, user?.id]);
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);

  useEffect(() => {
    setFavorites(readFavorites(key));

    function handleChange(event: Event) {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (!detail?.key || detail.key === key) setFavorites(readFavorites(key));
    }

    window.addEventListener("storage", handleChange);
    window.addEventListener("tripnest:favorites-changed", handleChange);
    return () => {
      window.removeEventListener("storage", handleChange);
      window.removeEventListener("tripnest:favorites-changed", handleChange);
    };
  }, [key]);

  function toggleFavorite(property: FavoriteProperty) {
    if (!user) return { ok: false, message: "Vui lòng đăng nhập để lưu chỗ nghỉ yêu thích." };

    const current = readFavorites(key);
    const exists = current.some((item) => item.id === property.id);
    const next = exists ? current.filter((item) => item.id !== property.id) : [property, ...current];
    writeFavorites(key, next);
    setFavorites(next);
    return { ok: true, favorited: !exists };
  }

  function removeFavorite(propertyId: string) {
    const next = readFavorites(key).filter((item) => item.id !== propertyId);
    writeFavorites(key, next);
    setFavorites(next);
  }

  return {
    favorites,
    favoriteIds: new Set(favorites.map((item) => item.id)),
    toggleFavorite,
    removeFavorite,
    signedIn: Boolean(user),
  };
}

