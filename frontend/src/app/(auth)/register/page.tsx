"use client";

import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getPasswordStrength(password: string): { score: number; label: string; color: string; barColor: string } {
  if (!password) return { score: 0, label: "", color: "", barColor: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[!@#$%^&*()\-_=+[\]{};':",.<>?/\\|`~]/.test(password)) score++;

  const map = [
    { label: "Mật khẩu RẤT YẾU", color: "text-rose-600", barColor: "bg-rose-500" },
    { label: "Mật khẩu YẾU", color: "text-orange-500", barColor: "bg-orange-500" },
    { label: "Mật khẩu MẠNH", color: "text-yellow-500", barColor: "bg-yellow-400" },
    { label: "Mật khẩu RẤT MẠNH", color: "text-emerald-600", barColor: "bg-emerald-500" },
  ];
  return { score, ...map[score] };
}

const HINT_ITEMS = [
  { check: (p: string) => p.length >= 8, text: "Ít nhất 8 ký tự" },
  { check: (p: string) => /[A-Z]/.test(p), text: "Có ít nhất 1 chữ cái in hoa" },
  { check: (p: string) => /[!@#$%^&*()\-_=+[\]{};':",.<>?/\\|`~]/.test(p), text: "Có ít nhất 1 ký tự đặc biệt (!@#$%...)" },
];

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color, barColor } = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${i < score ? barColor : "bg-slate-200"}`} />
        ))}
      </div>
      <p className={`mt-1 text-xs font-semibold ${color}`}>{label || " "}</p>
      {/* Fixed 3-line hint area — met items use opacity-0 to hold space */}
      <ul className="mt-1 text-xs text-slate-500">
        {HINT_ITEMS.map((hint) => (
          <li key={hint.text} className={`leading-5 ${hint.check(password) ? "opacity-0 select-none" : ""}`}>
            • {hint.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [purpose, setPurpose] = useState<"traveler" | "host">("traveler");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);
  const canSubmit = strength.score === 3;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("intent") === "host") {
      setPurpose("host");
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1"}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error?.message ?? "Đăng ký thất bại.");
        return;
      }

      setSession(payload.data.user, payload.data.accessToken);
      router.push(purpose === "host" ? "/host/properties/new" : "/");
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-6 py-10">
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
        <p className="text-sm uppercase tracking-[0.2em] text-teal-600">TripNest</p>
        <h1 className="mt-2 text-3xl font-semibold">Đăng ký</h1>
        <p className="mt-1 text-sm text-slate-500">Tên hiển thị ban đầu sẽ là địa chỉ email của bạn.</p>
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-700">Bạn muốn sử dụng TripNest để làm gì?</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPurpose("traveler")}
              className={`rounded-2xl border p-4 text-left transition ${
                purpose === "traveler"
                  ? "border-teal-600 bg-teal-50 ring-2 ring-teal-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="block font-semibold text-slate-900">Đặt chỗ nghỉ</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Tạo tài khoản khách để tìm và đặt phòng.</span>
            </button>
            <button
              type="button"
              onClick={() => setPurpose("host")}
              className={`rounded-2xl border p-4 text-left transition ${
                purpose === "host"
                  ? "border-teal-600 bg-teal-50 ring-2 ring-teal-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="block font-semibold text-slate-900">Đăng chỗ nghỉ</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Bắt đầu bằng tài khoản khách, sau đó gửi hồ sơ để TripNest duyệt thành host.</span>
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="text-slate-500">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-500">Mật khẩu</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <PasswordStrengthBar password={password} />
          </label>
        </div>
        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className={`mt-6 w-full rounded-full py-3 text-sm font-medium transition ${
            canSubmit
              ? "bg-teal-600 text-white hover:bg-teal-700"
              : "cursor-not-allowed bg-slate-200 text-slate-400"
          }`}
        >
          {loading ? "Đang tạo tài khoản..." : purpose === "host" ? "Tạo tài khoản và đăng chỗ nghỉ" : "Tạo tài khoản"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-teal-600">
            Đăng nhập
          </Link>
        </p>
      </form>
    </section>
  );
}
