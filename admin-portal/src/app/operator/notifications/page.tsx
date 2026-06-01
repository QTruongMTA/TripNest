"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

type NotificationMetadata = {
  propertyId?: string;
  action?: string;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: NotificationMetadata | null;
  createdAt: string;
};

function getNotificationTarget(item: NotificationItem) {
  if (item.metadata?.propertyId && item.metadata?.action === "PROPERTY_APPROVAL_REQUESTED") {
    return `/operator/listings?status=PENDING&focus=${item.metadata.propertyId}`;
  }
  return null;
}

export default function OperatorNotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notifications/mine")
      .then((response) => setItems(response.data.data.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function openNotification(item: NotificationItem) {
    const target = getNotificationTarget(item);
    if (!item.isRead) {
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, isRead: true } : value));
      await api.patch(`/notifications/mine/${item.id}/read`).catch(() => undefined);
    }
    if (target) router.push(target);
  }

  return (
    <PortalShell title="Thông báo">
      {loading ? <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" /></div> : (
        <div className="grid gap-3">
          {items.length === 0 && <div className="portal-card py-16 text-center text-slate-400">Chưa có thông báo.</div>}
          {items.map((item) => {
            const target = getNotificationTarget(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openNotification(item)}
                className={`portal-card p-5 text-left transition hover:border-teal-700/40 hover:shadow-md ${item.isRead ? "" : "border-amber-300 bg-amber-50/45"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p>
                    <p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                  {target ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">
                      Xem cơ sở <ArrowRight size={13} />
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
