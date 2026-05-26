"use client";

import { getAccessToken } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import { useRef, useState } from "react";

function LoginIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        fill="currentColor"
        d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.15 0-7.5 2.24-7.5 5v1h15v-1c0-2.76-3.35-5-7.5-5Z"
      />
    </svg>
  );
}

async function compressImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Không thể xử lý ảnh.");

  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - sourceSize) / 2;
  const sy = (bitmap.height - sourceSize) / 2;
  context.drawImage(bitmap, sx, sy, sourceSize, sourceSize, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.82);
}

export function UserAvatar({
  interactive = true,
  onAvatarPreview,
  previewSrc,
}: {
  interactive?: boolean;
  onAvatarPreview?: (dataUrl: string) => void;
  previewSrc?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (onAvatarPreview) {
      const avatar = await compressImage(file);
      onAvatarPreview(avatar);
      return;
    }

    const token = accessToken ?? getAccessToken();
    if (!user || !token) return;
    setUploading(true);

    try {
      const avatar = await compressImage(file);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"}/auth/me/avatar`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ avatar }),
        }
      );

      if (!response.ok) return;

      const payload = await response.json();
      setUser(payload.data);
    } finally {
      setUploading(false);
    }
  }

  const displayAvatar = previewSrc ?? user?.avatar;

  const avatarContent = (
    <>
        {displayAvatar ? (
          <Image
            src={displayAvatar}
            alt=""
            width={44}
            height={44}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <LoginIcon />
        )}
        {interactive ? (
          <span className="absolute inset-x-0 bottom-0 flex h-1/3 items-center justify-center rounded-b-full bg-black/55 text-[10px] font-semibold uppercase tracking-wide text-white">
            {uploading ? "..." : "Ảnh"}
          </span>
        ) : null}
    </>
  );

  return (
    <div className="flex items-center gap-3">
      {interactive ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group relative grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-white/35 bg-white/15 text-white shadow-sm backdrop-blur transition hover:bg-white/25"
          aria-label="Tải ảnh đại diện"
          title="Tải ảnh đại diện"
        >
          {avatarContent}
        </button>
      ) : (
        <span
          className="group relative grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-white/35 bg-white/15 text-white shadow-sm backdrop-blur"
          aria-hidden="true"
        >
          {avatarContent}
        </span>
      )}
      {interactive ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      ) : null}
      {user ? (
        <span className="hidden max-w-36 truncate text-sm font-medium text-white sm:block">
          {user.displayName || user.name}
        </span>
      ) : null}
    </div>
  );
}
