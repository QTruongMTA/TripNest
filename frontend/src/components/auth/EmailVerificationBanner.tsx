"use client";

import { getAccessToken } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export function EmailVerificationBanner() {
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.emailVerified !== false || dismissed) return null;

  async function handleResend() {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/auth/resend-verification`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const payload = await r.json().catch(() => ({}));
        setError(payload.error?.message ?? "Gửi email thất bại. Vui lòng thử lại.");
        return;
      }
      setSent(true);
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-50 flex items-center justify-between gap-3 bg-amber-400 px-4 py-2.5 text-amber-950">
      <div className="flex items-center gap-2 text-sm">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {sent ? (
          <span>Email xác thực đã được gửi lại. Kiểm tra hộp thư của bạn.</span>
        ) : error ? (
          <span>
            {error}{" "}
            <button type="button" onClick={handleResend} className="font-semibold underline underline-offset-2">
              Thử lại
            </button>
          </span>
        ) : (
          <span>
            Email <strong>{user.email}</strong> chưa được xác thực.{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-60"
            >
              {loading ? "Đang gửi..." : "Gửi lại email xác thực"}
            </button>
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Đóng"
        className="shrink-0 rounded-full p-1 hover:bg-amber-500/40"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
