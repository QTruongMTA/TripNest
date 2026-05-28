"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  Eye,
  EyeOff,
  Mail,
  Search,
  UserRound,
} from "lucide-react";
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

const PAGE_SIZE = 10;

const ROLE_LABELS: Record<string, string> = {
  GUEST: "Khách",
  HOST: "Chủ chỗ ở",
};

const ROLE_COLORS: Record<string, string> = {
  HOST: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  GUEST: "bg-slate-100 text-slate-600 ring-slate-200",
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

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  if (currentPage <= 3) return [1, 2, 3, 4, 5, "...", totalPages] as const;
  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
  }
  return [1, "...", currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, "...", totalPages] as const;
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
  const [page, setPage] = useState(1);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      const response = await api.get("/admin/users");
      if (cancelled) return;
      setUsers(response.data.data ?? []);
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
        if (user.role !== "GUEST" && user.role !== "HOST") return false;
        const keyword = search.trim().toLowerCase();
        const matchSearch = !keyword || user.email.toLowerCase().includes(keyword) || user.phone?.includes(keyword);
        const matchRole = roleFilter === "ALL" || user.role === roleFilter;
        return matchSearch && matchRole;
      })
      .sort((a, b) => {
        if (a.activeNow !== b.activeNow) return a.activeNow ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [roleFilter, search, users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
    setSelectedId(null);
  }, [roleFilter, search]);

  const rangeLabel =
    fromDate && toDate && fromDate === toDate
      ? formatDate(fromDate)
      : `${formatDate(fromDate)} - ${formatDate(toDate)}`;

  const passwordValue = "Không thể giải mã mật khẩu đã tạo vì hệ thống lưu bằng bcrypt một chiều.";

  return (
    <PortalShell title="Tài khoản khách hàng">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Tìm theo email hoặc SĐT"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="GUEST">Khách</option>
              <option value="HOST">Chủ chỗ ở</option>
            </select>

            <span className="text-sm text-slate-500">{filtered.length} tài khoản</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
              <table className="w-full table-fixed text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="w-14 px-3 py-3 text-left font-medium text-slate-500">STT</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-500">Email</th>
                    <th className="w-28 px-3 py-3 text-left font-medium text-slate-500">Vai trò</th>
                    <th className="w-36 px-3 py-3 text-left font-medium text-slate-500">Trạng thái</th>
                    <th className="w-28 px-3 py-3 text-left font-medium text-slate-500">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Không tìm thấy tài khoản.
                      </td>
                    </tr>
                  )}

                  {pagedUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      onClick={() => {
                        setShowPassword(false);
                        setSelectedId(user.id);
                      }}
                      className={`cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-teal-50/40 ${
                        selectedId === user.id ? "bg-teal-50" : ""
                      }`}
                    >
                      <td className="px-3 py-3 text-slate-500">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <Mail className="h-4 w-4" />
                          </span>
                          <p className="truncate font-medium text-slate-900">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded px-2 py-1 text-xs font-medium ring-1 ${ROLE_COLORS[user.role] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${
                          user.activeNow ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          <Circle className={`h-2.5 w-2.5 fill-current ${user.activeNow ? "text-green-500" : "text-slate-400"}`} />
                          {user.activeNow ? "Hoạt động" : "Không hoạt động"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-3">
                <p className="text-xs text-slate-500">
                  Trang {currentPage} / {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setPage(1)}
                    className="grid h-8 w-8 place-items-center rounded border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronsLeft size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    className="grid h-8 w-8 place-items-center rounded border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {buildPageItems(currentPage, totalPages).map((item, index) =>
                    item === "..." ? (
                      <span key={`ellipsis-${index}`} className="grid h-8 w-8 place-items-center text-slate-400">...</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        className={`h-8 min-w-8 rounded border px-2 text-sm ${
                          currentPage === item
                            ? "border-teal-700 bg-teal-700 font-semibold text-white"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    className="grid h-8 w-8 place-items-center rounded border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronRight size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(totalPages)}
                    className="grid h-8 w-8 place-items-center rounded border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronsRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="xl:sticky xl:top-0 xl:self-start">
          <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
            {!selectedId ? (
              <div className="py-14 text-center text-sm text-slate-400">Chọn một tài khoản để xem chi tiết.</div>
            ) : detailLoading || !detail ? (
              <div className="flex justify-center py-14">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-teal-50 text-teal-700">
                    {detail.user.avatar ? (
                      <img src={detail.user.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold text-slate-950">
                      {detail.user.displayName || detail.user.email}
                    </h2>
                    <p className="truncate text-xs text-slate-500">{detail.user.email}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {detail.user.activeNow ? "Đang đăng nhập" : `Lần cuối: ${formatDateTime(detail.user.lastSeenAt)}`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Tên hiển thị", detail.user.displayName || "-"],
                    ["Số điện thoại", detail.user.phone || "-"],
                    ["Ngày sinh", formatDate(detail.user.birthDate)],
                    ["Quốc tịch", detail.user.nationality || "-"],
                    ["Giới tính", detail.user.gender || "-"],
                    ["Địa chỉ", detail.user.address || "-"],
                    ["Vai trò", ROLE_LABELS[detail.user.role] ?? detail.user.role],
                    ["Email", detail.user.emailVerified ? "Đã xác minh" : "Chưa xác minh"],
                    ["Ngày tạo", formatDateTime(detail.user.createdAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md bg-slate-50 p-2">
                      <p className="text-[11px] text-slate-500">{label}</p>
                      <p className="mt-0.5 break-words font-medium text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-md bg-slate-50 p-2 text-xs">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500">Mật khẩu</p>
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="grid h-7 w-7 place-items-center rounded text-slate-500 hover:bg-white hover:text-slate-800"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="break-all font-mono text-[11px] text-slate-800">
                    {showPassword ? passwordValue : "••••••••••••••••"}
                  </p>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-950">Hoạt động</h3>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {rangeLabel}
                    </span>
                  </div>

                  <div className="grid gap-2">
                    <select
                      value={activityType}
                      onChange={(event) => setActivityType(event.target.value)}
                      className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500"
                    >
                      {ACTIVITY_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-teal-500"
                      />
                      <input
                        type="date"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {detail.activities.length === 0 ? (
                      <p className="py-5 text-sm text-slate-400">Không có hoạt động trong khoảng ngày này.</p>
                    ) : (
                      detail.activities.map((activity) => (
                        <p key={activity.id} className="text-xs leading-5 text-slate-600">
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
