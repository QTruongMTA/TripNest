"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";
import type { Dispute } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Chưa xử lý",
  RESOLVED: "Đã xử lý",
};

export default function OperatorReportsPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "OPEN";
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  const title = useMemo(() => `Báo cáo vi phạm - ${STATUS_LABEL[status] ?? status}`, [status]);

  useEffect(() => {
    setLoading(true);
    const disputeStatus = status === "OPEN" ? "OPEN" : "RESOLVED";
    api.get(`/operator/disputes?status=${disputeStatus}`)
      .then((response) => setItems(response.data.data ?? []))
      .finally(() => setLoading(false));
  }, [status]);

  function exportCsv() {
    const header = ["Tỉnh", "Chủ đề", "Host", "Guest", "Trạng thái", "Ngày tạo"];
    const rows = items.map((item) => [
      item.province?.name ?? "",
      item.subject,
      item.host.email,
      item.guest.email,
      item.status,
      new Date(item.createdAt).toLocaleString("vi-VN"),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-vi-pham-${status.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PortalShell title={title}>
      <div className="space-y-5">
        <div className="portal-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{items.length} báo cáo</p>
            <p className="mt-1 text-xs text-slate-500">Xuất báo cáo chỉ gồm dữ liệu thuộc tỉnh của operator.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-md border border-teal-800/20 bg-white px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Printer size={14} /> PDF
            </button>
          </div>
        </div>

        {loading ? <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" /></div> : (
          <div className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Tỉnh</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Chủ đề</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Host</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Guest</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-slate-400">Không có báo cáo trong nhóm này.</td></tr>}
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-4 text-slate-500">{item.province?.name ?? "-"}</td>
                    <td className="max-w-[260px] px-6 py-4">
                      <p className="truncate font-medium text-slate-800">{item.subject}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-400">{item.description}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{item.host.email}</td>
                    <td className="px-6 py-4 text-slate-500">{item.guest.email}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
