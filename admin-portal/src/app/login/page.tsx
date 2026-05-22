"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";
import api from "@/lib/api";
import { getRedirectPath } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import type { SessionUser } from "@/types";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setSession } = useAuthStore();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post<{ data: { accessToken: string; user: SessionUser } }>(
        "/auth/login",
        { email, password }
      );
      const { accessToken, user } = data.data;

      if (user.role !== "ADMIN" && user.role !== "OPERATOR_PROVINCE" && user.role !== "OPERATOR_SUB") {
        setError("Tài khoản của bạn không có quyền truy cập Portal này.");
        setLoading(false);
        return;
      }

      setSession(user, accessToken);
      router.replace(getRedirectPath(user.role));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? "Tài khoản hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-teal-900 text-white lg:grid-cols-[1.05fr_0.95fr]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,_#11665f_0%,_#0f766e_48%,_#0f3f3b_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,_rgba(255,255,255,0.12),_transparent_30%),radial-gradient(circle_at_82%_76%,_rgba(251,191,36,0.18),_transparent_26%)]" />

      <section className="relative hidden min-h-screen flex-col px-10 py-10 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-md border border-white/25 bg-white/15 text-lg font-semibold backdrop-blur">
            TN
          </span>
          <span>
            <span className="block text-2xl font-semibold tracking-tight">TripNest</span>
            <span className="block text-sm text-white/70">Khám phá Việt Nam</span>
          </span>
        </div>

        <div className="flex flex-1 items-center">
          <div className="max-w-2xl -translate-y-2">
          <h1 className="text-balance text-5xl font-semibold leading-tight">
            Hệ thống vận hành TripNesst
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/82">
            Hệ thống chỉ giành cho nhân viên TripNest
          </p>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-md border border-white/25 bg-white/15 text-lg font-semibold backdrop-blur">
              TN
            </div>
            <h1 className="text-2xl font-semibold">Hệ thống vận hành TripNesst</h1>
            <p className="mt-1 text-sm text-white/70">Hệ thống chỉ giành cho nhân viên TripNest</p>
          </div>

          <div className="rounded-lg border border-white/70 bg-[#fffaf4] p-6 text-slate-950 shadow-2xl shadow-teal-950/25 sm:p-8">
            <h2 className="text-3xl font-semibold">Đăng nhập</h2>

            {error ? (
              <div className="mt-6 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Tài khoản</span>
                <div className="relative h-14">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    className="h-14 w-full rounded-md border border-slate-200 bg-white py-0 pl-12 pr-4 text-sm text-slate-950 outline-none transition focus:border-teal-800 focus:ring-4 focus:ring-teal-800/10"
                  />
                </div>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Mật khẩu</span>
                <div className="relative h-14">
                  <Lock
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-14 w-full rounded-md border border-slate-200 bg-white py-0 pl-12 pr-12 text-sm text-slate-950 outline-none transition focus:border-teal-800 focus:ring-4 focus:ring-teal-800/10"
                  />
                  <button
                    type="button"
                    aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <button type="submit" disabled={loading} className="portal-button w-full">
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
