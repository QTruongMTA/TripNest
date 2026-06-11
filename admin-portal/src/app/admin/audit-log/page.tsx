"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

interface Log {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  actor: string;
  oldValue?: unknown;
  newValue?: unknown;
  time: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api.get("/admin/audit-logs")
      .then((response) => setLogs(response.data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalShell title="Audit Log">
      <div className="space-y-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Hanh dong</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Doi tuong</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Nguoi thuc hien</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Ma doi tuong</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Thoi gian</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">Chua co nhat ky.</td>
                  </tr>
                ) : null}
                {logs.map((log) => (
                  <>
                    <tr key={log.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-6 py-3">
                        <button
                          onClick={() => setOpenId(openId === log.id ? null : log.id)}
                          className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700"
                        >
                          {log.action}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500">{log.entity}</td>
                      <td className="px-6 py-3 text-slate-500">{log.actor}</td>
                      <td className="px-6 py-3 text-xs text-slate-400">
                        {log.entityId ? `#${log.entityId.slice(-8).toUpperCase()}` : "-"}
                      </td>
                      <td className="px-6 py-3 text-right text-xs text-slate-400">{log.time}</td>
                    </tr>
                    {openId === log.id ? (
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <AuditJson title="Truoc khi thay doi" value={log.oldValue} />
                            <AuditJson title="Sau khi thay doi / can cu" value={log.newValue} />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  );
}

function AuditJson({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
        {value ? JSON.stringify(value, null, 2) : "Khong co du lieu"}
      </pre>
    </div>
  );
}
