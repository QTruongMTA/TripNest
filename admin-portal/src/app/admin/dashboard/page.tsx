"use client";
import { useEffect, useState } from "react";
import { BookOpen, Building2, CreditCard, MapPin, UserCog, Users } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface DashboardData {
  totalUsers?: number;
  totalProperties?: number;
  totalTours?: number;
  totalBookings?: number;
  totalRevenue?: number;
  totalOperators?: number;
  recentBookings?: { id: string; status: string; totalPrice: number; createdAt: string }[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "teal" | "amber" | "slate";
}

const toneClass = {
  teal: "bg-teal-800 text-white",
  amber: "bg-amber-400 text-teal-950",
  slate: "bg-slate-100 text-teal-900",
};

function StatCard({ title, value, icon, tone }: StatCardProps) {
  return (
    <div className="portal-card p-5 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-teal-950/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-md ${toneClass[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({});
  const [operators, setOperators] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/admin/dashboard"),
      api.get("/admin/operators"),
    ]).then(([dashRes, opRes]) => {
      setData(dashRes.data.data ?? {});
      const ops = opRes.data.data ?? [];
      setOperators(Array.isArray(ops) ? ops.length : 0);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PortalShell title="Dashboard">
        <div className="portal-card flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" />
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell title="Dashboard">
      <div className="space-y-6">
        <section className="rounded-lg bg-teal-900 p-5 text-white shadow-sm shadow-teal-950/10">
          <p className="text-sm uppercase tracking-[0.24em] text-teal-100/75">Tổng quan vận hành</p>
          <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-semibold">Điều phối TripNest hôm nay</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                Theo dõi người dùng, booking, doanh thu và độ phủ operator trên toàn hệ thống.
              </p>
            </div>
            <span className="w-fit rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-teal-950">
              Admin Portal
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard title="Người dùng" value={data.totalUsers ?? 0} icon={<Users size={20} />} tone="teal" />
          <StatCard title="Chỗ ở & Tour" value={(data.totalProperties ?? 0) + (data.totalTours ?? 0)} icon={<Building2 size={20} />} tone="slate" />
          <StatCard title="Đặt chỗ" value={data.totalBookings ?? 0} icon={<BookOpen size={20} />} tone="slate" />
          <StatCard title="Doanh thu (VNĐ)" value={(data.totalRevenue ?? 0).toLocaleString("vi-VN")} icon={<CreditCard size={20} />} tone="amber" />
          <StatCard title="Operators" value={operators} icon={<UserCog size={20} />} tone="teal" />
          <StatCard title="Tỉnh đã phủ" value={operators} icon={<MapPin size={20} />} tone="amber" />
        </div>

        {(data.recentBookings?.length ?? 0) > 0 ? (
          <div className="portal-card p-5">
            <h2 className="mb-4 text-xl font-semibold text-slate-950">Đặt chỗ gần đây</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2 text-left font-medium text-slate-500">ID</th>
                    <th className="py-2 text-left font-medium text-slate-500">Trạng thái</th>
                    <th className="py-2 text-right font-medium text-slate-500">Tổng tiền</th>
                    <th className="py-2 text-right font-medium text-slate-500">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentBookings?.map((b) => (
                    <tr key={b.id} className="border-b border-slate-50">
                      <td className="py-2 font-mono text-xs text-slate-500">{b.id.slice(0, 8)}...</td>
                      <td className="py-2">
                        <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">{b.status}</span>
                      </td>
                      <td className="py-2 text-right font-medium">{Number(b.totalPrice).toLocaleString("vi-VN")}đ</td>
                      <td className="py-2 text-right text-slate-400">{new Date(b.createdAt).toLocaleDateString("vi-VN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </PortalShell>
  );
}
