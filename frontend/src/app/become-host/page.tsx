"use client";

import Link from "next/link";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { useAuthStore } from "@/store/authStore";

export default function BecomeHostPage() {
  const user = useAuthStore((state) => state.user);
  const isHost = user?.role === "HOST";
  const actionHref = !user ? "/register?intent=host" : isHost ? "/host/properties" : "/host/properties/new";
  const actionLabel = !user ? "Đăng ký để bắt đầu" : isHost ? "Vào khu vực chủ nhà" : "Đăng chỗ nghỉ đầu tiên";

  return (
    <div className="min-h-screen bg-[#f7fbfa] text-slate-950">
      <div className="relative bg-teal-950 pb-16 pt-24 text-white">
        <Header overlay />
        <div className="mx-auto max-w-5xl px-5 pt-10 md:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">TripNest dành cho chủ nhà</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">Bắt đầu từ tài khoản khách, trở thành host sau khi được xác minh</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-teal-50/80">
            TripNest không cho tự gán quyền host. Bạn đăng chỗ nghỉ và gửi hồ sơ, nhân viên vận hành kiểm tra, sau đó tài khoản mới được nâng thành host.
          </p>
          <Link href={actionHref} className="mt-7 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-teal-950 transition hover:bg-teal-50">
            {actionLabel}
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-5 py-12 md:px-6">
        <div className="grid gap-5 md:grid-cols-4">
          <Step number="1" title="Tạo tài khoản" text="Tài khoản mới mặc định là tài khoản khách." />
          <Step number="2" title="Đăng chỗ nghỉ" text="Khai báo thông tin, giá, quy tắc và pháp lý." />
          <Step number="3" title="TripNest xét duyệt" text="Operator xác minh hồ sơ và cơ sở lưu trú." />
          <Step number="4" title="Quản lý booking" text="Sau khi duyệt, host xác nhận các booking dạng yêu cầu." />
        </div>

        <div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-950">
          <strong>Quy tắc booking:</strong> Chỗ nghỉ chọn “Đặt ngay” sẽ được hệ thống tự xác nhận. Chỗ nghỉ chọn “Yêu cầu đặt phòng” sẽ xuất hiện tại <strong>Khu vực chủ nhà → Đặt phòng</strong> để host xác nhận hoặc từ chối.
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 font-semibold text-teal-800">{number}</span>
      <h2 className="mt-4 font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
