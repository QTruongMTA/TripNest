"use client";

import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error?.message ?? "Đăng nhập thất bại.");
        return;
      }

      setSession(payload.data.user, payload.data.accessToken);
      router.push(searchParams.get("next") ?? "/");
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full rounded-[32px] border border-slate-200 bg-white p-8 text-slate-900 shadow-2xl"
    >
      <Link
        href="/"
        aria-label="Đóng"
        className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        ×
      </Link>
      <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">
        TripNest
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Đăng nhập</h1>
      <div className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm">
          <span className="text-slate-500">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400"
            required
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-slate-500">Mật khẩu</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400"
            required
          />
        </label>
      </div>
      {error ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <Button className="mt-6 w-full py-3">
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
      <p className="mt-4 text-center text-sm text-slate-500">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-medium text-emerald-700">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-6 py-10">
      <Suspense
        fallback={
          <div className="w-full rounded-[32px] border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
            Đang tải...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </section>
  );
}
