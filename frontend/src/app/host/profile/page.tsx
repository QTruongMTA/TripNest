"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";

type HostApprovalStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

type HostRequestDocuments = {
  source?: string;
  profile?: {
    displayName?: string | null;
    phone?: string | null;
    address?: string | null;
    nationality?: string | null;
  };
  latestProperty?: {
    id: string;
    title: string;
    city: string;
    status: string;
    legalEntityType: "INDIVIDUAL" | "BUSINESS" | null;
    ownerAlias: string | null;
    owners: Array<{
      firstName: string;
      lastName: string;
      birthDate: string;
    }>;
  };
};

type HostProfileResponse = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    displayName?: string | null;
    phone?: string | null;
    address?: string | null;
    nationality?: string | null;
  };
  latestRequest: {
    id: string;
    status: HostApprovalStatus;
    notes?: string | null;
    documents?: HostRequestDocuments | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  latestProperty: {
    id: string;
    title: string;
    city: string;
    status: string;
    legalEntityType: "INDIVIDUAL" | "BUSINESS" | null;
    ownerAlias: string | null;
    owners: Array<{
      firstName: string;
      lastName: string;
      birthDate: string;
    }>;
  } | null;
};

const statusLabel: Record<HostApprovalStatus, string> = {
  PENDING: "Đang chờ duyệt",
  UNDER_REVIEW: "Đang xem xét",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};

type ApiError = {
  response?: {
    data?: {
      error?: { message?: string };
      message?: string;
    };
  };
};

function getApiErrorMessage(err: unknown, fallback: string) {
  const data = (err as ApiError).response?.data;
  return data?.error?.message ?? data?.message ?? fallback;
}

export default function HostProfilePage() {
  const sessionUser = useAuthStore((state) => state.user);
  const [displayName, setDisplayName] = useState(sessionUser?.displayName ?? sessionUser?.name ?? "");
  const [phone, setPhone] = useState(sessionUser?.phone ?? "");
  const [address, setAddress] = useState(sessionUser?.address ?? "");
  const [nationality, setNationality] = useState(sessionUser?.nationality ?? "Việt Nam");
  const [notes, setNotes] = useState("");
  const [latestRequest, setLatestRequest] = useState<HostProfileResponse["latestRequest"]>(null);
  const [latestProperty, setLatestProperty] = useState<HostProfileResponse["latestProperty"]>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const requestDocs = latestRequest?.documents ?? null;
  const latestProfileSnapshot = requestDocs?.profile ?? null;
  const latestPropertySnapshot = requestDocs?.latestProperty ?? null;
  const requestTone =
    latestRequest?.status === "REJECTED"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : latestRequest?.status === "APPROVED"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-amber-200 bg-amber-50 text-amber-900";

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Vui lòng đăng nhập để bổ sung hồ sơ host.");
      setLoading(false);
      return;
    }

    api
      .get<{ data: HostProfileResponse }>("/host/profile-request", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        const data = response.data.data;
        setDisplayName(data.user.displayName ?? data.user.name ?? "");
        setPhone(data.user.phone ?? "");
        setAddress(data.user.address ?? "");
        setNationality(data.user.nationality ?? "Việt Nam");
        setLatestRequest(data.latestRequest);
        setLatestProperty(data.latestProperty);
      })
      .catch((err: unknown) => {
        setError(getApiErrorMessage(err, "Không thể tải hồ sơ host."));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const token = getAccessToken();
    if (!token) {
      setError("Vui lòng đăng nhập để gửi hồ sơ.");
      setSaving(false);
      return;
    }

    try {
      const response = await api.post<{ data: { request: HostProfileResponse["latestRequest"] } }>(
        "/host/profile-request",
        {
          displayName,
          phone,
          address,
          nationality,
          notes,
          documents: {
            source: "host-profile-page",
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLatestRequest(response.data.data.request);
      setLatestProperty((current) => current);
        setSuccess("Hồ sơ đã được gửi. TripNest sẽ tiếp tục xét duyệt.");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Không thể gửi hồ sơ."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Hồ sơ host</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Bổ sung hồ sơ</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Cập nhật thông tin liên hệ và gửi lại hồ sơ để TripNest tiếp tục xét duyệt.
          </p>
        </div>
        <a href="/host/properties" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Quay lại danh sách
        </a>
      </div>

      {error ? <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-teal-950/5">
          <h2 className="text-lg font-semibold text-slate-950">Thông tin cần hoàn thiện</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Đây là hồ sơ nội bộ TripNest. Khi có yêu cầu bổ sung, chỉ cần sửa các trường bên dưới rồi gửi lại.
          </p>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Tên hiển thị
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                placeholder="Tên host"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Số điện thoại
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                placeholder="Ví dụ: 0901234567"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Địa chỉ
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                placeholder="Địa chỉ liên hệ"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Quốc tịch
              <input
                value={nationality}
                onChange={(event) => setNationality(event.target.value)}
                className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                placeholder="Việt Nam"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Ghi chú bổ sung
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
                className="rounded-md border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                placeholder="Nội dung cần TripNest xem lại thêm"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="mt-6 rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? "Đang gửi..." : "Gửi bổ sung hồ sơ"}
          </button>
        </form>

        <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-teal-950/5">
          <h2 className="text-lg font-semibold text-slate-950">Trạng thái hiện tại</h2>
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Tài khoản</p>
              <p className="mt-1 font-medium">{sessionUser?.displayName || sessionUser?.name || sessionUser?.email}</p>
              <p className="mt-1 text-slate-500">{sessionUser?.email}</p>
            </div>
            <div className={`rounded-md border px-3 py-3 ${requestTone}`}>
              <p className="text-xs uppercase tracking-[0.08em] opacity-75">Hồ sơ</p>
              <p className="mt-1 font-medium">{latestRequest ? statusLabel[latestRequest.status] : "Chưa gửi hồ sơ"}</p>
              {latestRequest?.notes ? <p className="mt-1 leading-6">{latestRequest.notes}</p> : null}
              {latestRequest?.status === "REJECTED" ? (
                <p className="mt-2 text-xs leading-5">
                  Sửa các thông tin bên trái theo góp ý của TripNest rồi gửi lại một lần nữa.
                </p>
              ) : null}
              {latestRequest?.status === "APPROVED" ? (
                <p className="mt-2 text-xs leading-5">
                  Hồ sơ đã ổn để tiếp tục đăng cơ sở và quản lý đặt phòng.
                </p>
              ) : null}
            </div>
            {latestRequest ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-400">TripNest đang xem</p>
                <div className="mt-2 grid gap-3 text-sm text-slate-700">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Thông tin liên hệ</p>
                    <p className="mt-1">{(latestProfileSnapshot?.displayName ?? displayName) || "Chưa có tên hiển thị"}</p>
                    <p className="mt-1 text-slate-500">{(latestProfileSnapshot?.phone ?? phone) || "Chưa có số điện thoại"}</p>
                    <p className="mt-1 text-slate-500">{(latestProfileSnapshot?.address ?? address) || "Chưa có địa chỉ"}</p>
                    <p className="mt-1 text-slate-500">{latestProfileSnapshot?.nationality ?? nationality}</p>
                  </div>
                  {latestPropertySnapshot ? (
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
                      <p className="font-medium text-slate-800">Cơ sở gần nhất</p>
                      <p className="mt-1">{latestPropertySnapshot.title}</p>
                      <p className="text-slate-500">{latestPropertySnapshot.city}</p>
                      <p className="mt-1 text-slate-500">
                        {latestPropertySnapshot.legalEntityType === "BUSINESS" ? "Doanh nghiệp" : "Cá nhân"}
                        {latestPropertySnapshot.ownerAlias ? ` · ${latestPropertySnapshot.ownerAlias}` : ""}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            {latestProperty ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 leading-6 text-slate-600">
                <p className="font-medium text-slate-800">Cơ sở gần nhất</p>
                <p className="mt-1">{latestProperty.title}</p>
                <p>{latestProperty.city}</p>
                <p className="mt-1">
                  {latestProperty.legalEntityType === "BUSINESS" ? "Doanh nghiệp" : "Cá nhân"}
                  {latestProperty.ownerAlias ? ` · ${latestProperty.ownerAlias}` : ""}
                </p>
                {latestProperty.owners.length ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Chủ sở hữu: {latestProperty.owners.map((owner) => `${owner.firstName} ${owner.lastName}`).join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 leading-6 text-slate-600">
              Nếu TripNest yêu cầu bổ sung thêm, bạn có thể cập nhật lại thông tin ở đây rồi gửi lại một lần nữa.
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
