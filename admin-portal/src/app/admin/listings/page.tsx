"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Listing {
  id: string;
  title: string;
  city: string;
  status: string;
  type: string;
  owner?: string;
  ownerEmail?: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  PENDING: "bg-amber-50 text-amber-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  SUSPENDED: "bg-red-50 text-red-700",
};

export default function ListingsPage() {
  const [data, setData] = useState<{ listings?: Listing[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/listings").then((response) => setData(response.data.data ?? {})).finally(() => setLoading(false));
  }, []);

  const listings = (data.listings ?? []).filter((listing) => listing.type !== "TOUR");

  async function updateStatus(id: string, status: string) {
    await api.patch(`/admin/listings/PROPERTY/${id}/status`, { status });
    const response = await api.get("/admin/listings");
    setData(response.data.data ?? {});
  }

  return (
    <PortalShell title="Chỗ ở">
      <div className="space-y-5">
        <p className="text-sm text-slate-500">{listings.length} chỗ ở</p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Tên</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Địa điểm</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Loại</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Host</th>
                    <th className="px-6 py-3 text-left font-medium text-slate-500">Trạng thái</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {listings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">Không có dữ liệu.</td>
                    </tr>
                  ) : null}

                  {listings.map((listing) => (
                    <tr key={listing.id} className="border-b border-slate-50 last:border-0">
                      <td className="max-w-[240px] truncate px-6 py-4 font-medium text-slate-800">{listing.title}</td>
                      <td className="px-6 py-4 text-slate-500">{listing.city}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{listing.type}</td>
                      <td className="px-6 py-4 text-slate-500">{listing.ownerEmail ?? listing.owner}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[listing.status] ?? "bg-slate-100"}`}>
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={listing.status}
                          onChange={(event) => updateStatus(listing.id, event.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none"
                        >
                          {["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"].map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
