const FALLBACK_PROPERTY_IMAGES: Record<string, string> = {
  HOTEL: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
  HOMESTAY: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80",
  APARTMENT: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80",
  VILLA: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=900&q=80",
  RESORT: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80",
  HOUSE: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
  UNIQUE: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
};

export function getFallbackPropertyImage(type: string | null | undefined): string {
  return (
    FALLBACK_PROPERTY_IMAGES[type ?? ""] ??
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80"
  );
}

export function normalizePropertyImageUrl(
  url: string | null | undefined,
  type: string | null | undefined
): string {
  const trimmed = typeof url === "string" ? url.trim() : "";

  const publicApiUrl = (
    process.env.PUBLIC_API_URL ??
    process.env.BACKEND_PUBLIC_URL ??
    `http://localhost:${process.env.PORT ?? 5001}`
  ).replace(/\/+$/, "");

  try {
    const parsedUrl = new URL(trimmed);

    if (
      ["localhost", "127.0.0.1"].includes(parsedUrl.hostname) &&
      parsedUrl.pathname.startsWith("/uploads/")
    ) {
      return `${publicApiUrl}${parsedUrl.pathname}${parsedUrl.search}`;
    }
  } catch {
    // Non-absolute paths are handled below.
  }

  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed) {
    const uploadPath = trimmed.replace(/\\/g, "/");

    if (uploadPath.startsWith("/uploads/")) {
      return `${publicApiUrl}${uploadPath}`;
    }

    if (uploadPath.startsWith("uploads/")) {
      return `${publicApiUrl}/${uploadPath}`;
    }
  }

  return getFallbackPropertyImage(type);
}
