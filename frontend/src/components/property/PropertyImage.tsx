"use client";

import Image from "next/image";
import { useState } from "react";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80";

type PropertyImageProps = {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
};

export function PropertyImage({
  src,
  alt,
  sizes,
  className = "object-cover",
}: PropertyImageProps) {
  const [imageSrc, setImageSrc] = useState(src || FALLBACK_IMAGE);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      unoptimized
      sizes={sizes}
      className={className}
      onError={() => {
        if (imageSrc !== FALLBACK_IMAGE) setImageSrc(FALLBACK_IMAGE);
      }}
    />
  );
}
