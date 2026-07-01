"use client";

import { getAccessToken } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

type VerifyState = "loading" | "success" | "expired" | "invalid";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [state, setState] = useState<VerifyState>("loading");
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    fetch(`${API}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (r.status === 410) { setState("expired"); return; }
        if (!r.ok) { setState("invalid"); return; }
        setState("success");
        if (user) setUser({ ...user, emailVerified: true });
        setTimeout(() => router.push("/"), 3000);
      })
      .catch(() => setState("invalid"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleResend() {
    const accessToken = getAccessToken();
    if (!accessToken) { window.location.href = "/login"; return; }
    setResending(true);
    try {
      await fetch(`${API}/auth/resend-verification`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setResendDone(true);
    } catch {
      // best-effort
    } finally {
      setResending(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-6 py-10">
      <div className="relative w-full rounded-[32px] border border-slate-200 bg-white p-8 text-slate-900 shadow-2xl">
        <Link
          href="/"
          aria-label="Đóng"
          className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          ×
        </Link>
        <p className="text-sm uppercase tracking-[0.2em] text-teal-600">TripNest</p>

        {state === "loading" && (
          <>
            <h1 className="mt-4 text-2xl font-semibold">Đang xác thực...</h1>
            <p className="mt-2 text-sm text-slate-500">Vui lòng chờ trong giây lát.</p>
            <div className="mt-6 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
            </div>
          </>
        )}

        {state === "success" && (
          <>
            <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-teal-600" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Email đã xác thực!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Tài khoản của bạn đã được xác thực thành công. Đang chuyển hướng về trang chủ...
            </p>
            <Link
              href="/"
              className="mt-6 inline-block w-full rounded-full bg-teal-600 py-3 text-center text-sm font-medium text-white transition hover:bg-teal-700"
            >
              Về trang chủ ngay
            </Link>
          </>
        )}

        {state === "expired" && (
          <>
            <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Link đã hết hạn</h1>
            <p className="mt-2 text-sm text-slate-500">
              Link xác thực chỉ có hiệu lực trong 24 giờ. Vui lòng yêu cầu gửi lại email xác thực mới.
            </p>
            {resendDone ? (
              <p className="mt-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-700">
                Email xác thực mới đã được gửi. Kiểm tra hộp thư của bạn.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-6 w-full rounded-full bg-teal-600 py-3 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {resending ? "Đang gửi..." : "Gửi lại email xác thực"}
              </button>
            )}
          </>
        )}

        {state === "invalid" && (
          <>
            <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Link không hợp lệ</h1>
            <p className="mt-2 text-sm text-slate-500">
              Link xác thực này không hợp lệ hoặc đã được sử dụng.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block w-full rounded-full bg-slate-800 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-900"
            >
              Về trang chủ
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
