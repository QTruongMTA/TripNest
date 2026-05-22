"use client";
import { useEffect, useState } from "react";
import { AlertCircle, Building2, CheckSquare, ClipboardList, MapPin } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface DashboardData {
  provinces?: { id: string; name: string; type: string }[];
  stats?: {
    totalListings?: number;
    pendingListings?: number;
    pendingApprovals?: number;
    openDisputes?: number;
    activeTasks?: number;
    completedThisMonth?: number;
    totalCompleted?: number;
  };
}

function StatCard({ title, value, icon, tone }: { title: string; value: number; icon: React.ReactNode; tone: "teal" | "amber" | "slate" }) {
  const colors = {
    teal: "bg-teal-800 text-white",
    amber: "bg-amber-400 text-teal-950",
    slate: "bg-slate-100 text-teal-900",
  };

  return (
    <div className="portal-card p-5 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-teal-950/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-md ${colors[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function OperatorDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/operator/dashboard").then((r) => setData(r.data.data ?? {})).finally(() => setLoading(false));
  }, []);

  const isProvince = user?.role === "OPERATOR_PROVINCE";
  const stats = data.stats ?? {};

  return (
    <PortalShell title="Dashboard">
      <div className="space-y-6">
        <section className="rounded-lg bg-teal-900 p-5 text-white shadow-sm shadow-teal-950/10">
          <p className="text-sm uppercase tracking-[0.24em] text-teal-100/75">Điều hành địa phương</p>
          <div className="mt-3">
            <h2 className="text-3xl font-semibold">{isProvince ? "Quản lý tỉnh được phân công" : "Theo dõi nhiệm vụ thực địa"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Nắm nhanh listing, host approval, tranh chấp và tiến độ nhiệm vụ trong khu vực phụ trách.
            </p>
          </div>
        </section>

        {data.provinces && data.provinces.length > 0 ? (
          <div className="portal-card flex flex-wrap items-center gap-2 p-4">
            <MapPin size={16} className="text-teal-800" />
            <span className="text-sm font-medium text-slate-500">Phụ trách:</span>
            {data.provinces.map((p) => (
              <span key={p.id} className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{p.name}</span>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="portal-card flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isProvince ? (
              <>
                <StatCard title="Chỗ ở trong tỉnh" value={stats.totalListings ?? 0} icon={<Building2 size={20} />} tone="teal" />
                <StatCard title="Chờ duyệt" value={stats.pendingListings ?? 0} icon={<ClipboardList size={20} />} tone="amber" />
                <StatCard title="Host chờ xét duyệt" value={stats.pendingApprovals ?? 0} icon={<CheckSquare size={20} />} tone="slate" />
                <StatCard title="Tranh chấp đang mở" value={stats.openDisputes ?? 0} icon={<AlertCircle size={20} />} tone="amber" />
                <StatCard title="Nhiệm vụ đang chạy" value={stats.activeTasks ?? 0} icon={<ClipboardList size={20} />} tone="teal" />
              </>
            ) : (
              <>
                <StatCard title="Nhiệm vụ đang chạy" value={stats.activeTasks ?? 0} icon={<ClipboardList size={20} />} tone="teal" />
                <StatCard title="Hoàn thành tháng này" value={stats.completedThisMonth ?? 0} icon={<CheckSquare size={20} />} tone="amber" />
                <StatCard title="Tổng hoàn thành" value={stats.totalCompleted ?? 0} icon={<CheckSquare size={20} />} tone="slate" />
              </>
            )}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
