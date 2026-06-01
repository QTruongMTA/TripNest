"use client";
import { Mail, ShieldCheck, User } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";

const ROLE_LABEL: Record<string, string> = {
  OPERATOR_PROVINCE: "Operator tỉnh",
  OPERATOR_SUB: "Operator thực địa",
};

export default function OperatorProfilePage() {
  const { user } = useAuthStore();

  return (
    <PortalShell title="Hồ sơ cá nhân">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="portal-card p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-md bg-teal-800 text-xl font-bold text-white">
              {user?.email?.[0]?.toUpperCase() ?? "O"}
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-950">{user?.name ?? user?.email}</p>
              <p className="mt-1 text-sm text-slate-500">{ROLE_LABEL[user?.role ?? ""] ?? "Operator"}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
              <Mail size={17} className="text-teal-800" />
              <span className="text-sm text-slate-600">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
              <User size={17} className="text-teal-800" />
              <span className="text-sm text-slate-600">{user?.id}</span>
            </div>
          </div>
        </div>

        <div className="portal-card p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck size={18} className="text-teal-800" />
            Ranh giới quyền
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Operator chỉ xem và xử lý dữ liệu trong tỉnh được phân công. Các chức năng cấu hình hệ thống, hoa hồng, gắn nổi bật và quản lý tài khoản thuộc quyền Admin.
          </p>
        </div>
      </div>
    </PortalShell>
  );
}
