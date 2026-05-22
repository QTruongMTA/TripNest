"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Log { id: string; action: string; entity: string; actor: string; time: string; }

export default function AuditLogPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/admin/audit-logs").then((r) => setLogs(r.data.data ?? [])).finally(() => setLoading(false)); }, []);

  return (
    <PortalShell title="Audit Log">
      <div className="space-y-5">
        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Hành động</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Đối tượng</th>
                  <th className="text-left px-6 py-3 text-slate-500 font-medium">Người thực hiện</th>
                  <th className="text-right px-6 py-3 text-slate-500 font-medium">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && <tr><td colSpan={4} className="text-center text-slate-400 py-12">Chưa có nhật ký.</td></tr>}
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono">{l.action}</span></td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{l.entity}</td>
                    <td className="px-6 py-3 text-slate-500">{l.actor}</td>
                    <td className="px-6 py-3 text-right text-slate-400 text-xs">{l.time}</td>
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
