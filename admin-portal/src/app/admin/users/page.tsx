"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Circle, Mail, Search, UserRound } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface User {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  activeNow: boolean;
  accountStatus: "ONLINE" | "OFFLINE";
  lastSeenAt?: string | null;
  emailVerified: boolean;
  createdAt: string;
  phone?: string | null;
}

interface UserDetail {
  user: User & {
    displayName?: string | null;
    avatar?: string | null;
    birthDate?: string | null;
    nationality?: string | null;
    gender?: string | null;
    address?: string | null;
    updatedAt: string;
  };
  activities: {
    id: string;
    type: "REVIEW" | "BOOKING" | "SEARCH" | "SYSTEM";
    activityName: string;
    place: string;
    performedAt: string;
  }[];
}

const ROLE_LABELS: Record<string, string> = {
  GUEST: "Khách",
  HOST: "Chủ chỗ ở",
  OPERATOR_PROVINCE: "Operator Tỉnh",
  OPERATOR_SUB: "Operator Con",
};

const ROLE_COLORS: Record<string, string> = {
  OPERATOR_PROVINCE: "bg-blue-50 text-blue-700 ring-blue-100",
  OPERATOR_SUB: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  HOST: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  GUEST: "bg-slate-100 text-slate-600 ring-slate-200",
};

const ROLE_SORT_ORDER: Record<string, number> = {
  OPERATOR_PROVINCE: 1,
  OPERATOR_SUB: 2,
  HOST: 3,
  GUEST: 4,
};

const ACTIVITY_TYPES = [
  { value: "ALL", label: "Tất cả" },
  { value: "REVIEW", label: "Đánh giá" },
  { value: "BOOKING", label: "Đặt chỗ" },
  { value: "SEARCH", label: "Tìm kiếm" },
  { value: "SYSTEM", label: "Hệ thống" },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [activityType, setActivityType] = useState("ALL");
  const [fromDate, setFromDate] = useState(todayInputValue());
  const [toDate, setToDate] = useState(todayInputValue());

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      const response = await api.get("/admin/users");
      if (cancelled) return;
      const data = response.data.data ?? [];
      setUsers(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
      setLoading(false);
    }

    loadUsers();
    const timer = window.setInterval(loadUsers, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    const params = new URLSearchParams({
      type: activityType,
      from: fromDate,
      to: toDate,
    });

    setDetailLoading(true);
    api
      .get(`/admin/users/${selectedId}?${params.toString()}`)
      .then((response) => setDetail(response.data.data ?? null))
      .finally(() => setDetailLoading(false));
  }, [activityType, fromDate, selectedId, toDate]);

  const filtered = useMemo(() => {
    return users
      .filter((user) => {
        if (user.role === "ADMIN") return false;
        const keyword = search.trim().toLowerCase();
        const matchSearch =
          !keyword ||
          user.email.toLowerCase().includes(keyword);
        const matchRole = roleFilter === "ALL" || user.role === roleFilter;
        return matchSearch && matchRole;
      })
      .sort((a, b) => {
        if (a.activeNow !== b.activeNow) return a.activeNow ? -1 : 1;

        const roleCompare = (ROLE_SORT_ORDER[a.role] ?? 99) - (ROLE_SORT_ORDER[b.role] ?? 99);
        if (roleCompare !== 0) return roleCompare;

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [roleFilter, search, users]);

  const rangeLabel =
    fromDate && toDate && fromDate === toDate
      ? formatDate(fromDate)
      : `${formatDate(fromDate)} - ${formatDate(toDate)}`;

  return (
    <PortalShell title="Tất cả tài khoản">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Tìm theo email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500"
            >
              <option value="ALL">Tất cả vai trò</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <span className="text-sm text-slate-500">{filtered.length} tài khoản</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-slate-500">Email</th>
                      <th className="px-6 py-3 text-left font-medium text-slate-500">Vai trò</th>
                      <th className="px-6 py-3 text-left font-medium text-slate-500">Trạng thái tài khoản</th>
                      <th className="px-6 py-3 text-left font-medium text-slate-500">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400">
                          Không tìm thấy tài khoản.
                        </td>
                      </tr>
                    )}

                    {filtered.map((user) => (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedId(user.id)}
                        className={`cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-teal-50/40 ${
                          selectedId === user.id ? "bg-teal-50" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                              <Mail className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded px-2 py-1 text-xs font-medium ring-1 ${ROLE_COLORS[user.role] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                            {ROLE_LABELS[user.role] ?? user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${
                            user.activeNow ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            <Circle className={`h-2.5 w-2.5 fill-current ${user.activeNow ? "text-green-500" : "text-slate-400"}`} />
                            {user.activeNow ? "Đang hoạt động" : "Không hoạt động"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <aside className="xl:sticky xl:top-0 xl:self-start">
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            {!selectedId ? (
              <div className="py-16 text-center text-sm text-slate-400">Chọn một tài khoản để xem chi tiết.</div>
            ) : detailLoading || !detail ? (
              <div className="flex justify-center py-16">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-teal-50 text-teal-700">
                    {detail.user.avatar ? (
                      <img src={detail.user.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-6 w-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold text-slate-950">
                      {detail.user.displayName || detail.user.email}
                    </h2>
                    <p className="truncate text-sm text-slate-500">{detail.user.email}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {detail.user.activeNow ? "Đang đăng nhập local" : `Lần cuối: ${formatDateTime(detail.user.lastSeenAt)}`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Tên hiển thị", detail.user.displayName || "-"],
                    ["Số điện thoại", detail.user.phone || "-"],
                    ["Ngày sinh", formatDate(detail.user.birthDate)],
                    ["Quốc tịch", detail.user.nationality || "-"],
                    ["Giới tính", detail.user.gender || "-"],
                    ["Địa chỉ", detail.user.address || "-"],
                    ["Vai trò", ROLE_LABELS[detail.user.role] ?? detail.user.role],
                    ["Email xác minh", detail.user.emailVerified ? "Đã xác minh" : "Chưa xác minh"],
                    ["Ngày tạo", formatDateTime(detail.user.createdAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-1 break-words font-medium text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-950">Hoạt động</h3>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {rangeLabel}
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    <select
                      value={activityType}
                      onChange={(event) => setActivityType(event.target.value)}
                      className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500"
                    >
                      {ACTIVITY_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500"
                    />
                    <input
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {detail.activities.length === 0 ? (
                      <p className="py-6 text-sm text-slate-400">Không có hoạt động trong khoảng ngày này.</p>
                    ) : (
                      detail.activities.map((activity) => (
                        <p key={activity.id} className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">{activity.activityName}</span>
                          {" | "}
                          {activity.place}
                          {" | "}
                          {formatDate(activity.performedAt)}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
