"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  FileSpreadsheet,
  HandCoins,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import clsx from "clsx";
import { PortalShell } from "@/components/layout/PortalShell";
import api from "@/lib/api";

type TabKey = "settlements" | "refunds" | "payouts" | "bookings";

interface RevenueSummary {
  grossBookingValue: number;
  netRevenue: number;
  pendingPayout: number;
  commissionReceivable: number;
  totalRefund: number;
  disputedBookings: number;
  waitingSettlementBookings: number;
  readyBookings: number;
  cancellationRate: number;
  refundRate: number;
}

interface SettlementRow {
  hostId: string;
  hostName: string;
  hostEmail: string;
  period: string;
  bookingCount: number;
  grossAmount: number;
  refundAmount: number;
  disputeCount: number;
  commission: number;
  adjustment: number;
  hostPayout: number;
  commissionReceivable: number;
  status: string;
}

interface BookingDetail {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  guest: string;
  guestEmail: string;
  property: string;
  province: string;
  propertyType: string;
  checkIn: string;
  checkOut: string;
  settlementPeriod: string;
  grossAmount: number;
  settlementBase: number;
  refundAmount: number;
  penaltyAmount: number;
  commissionRate: number;
  commission: number;
  netRevenue: number;
  transferReceived: number;
  hostDirectReceived: number;
  hostPayout: number;
  commissionReceivable: number;
  adjustment: number;
  status: string;
  refundStatus: string | null;
  refundedAt: string | null;
  paymentMethod: string | null;
  paymentMethodLabel: string;
  paymentModel: string;
  paymentStatus: string;
  payoutStatus: string;
  disputeStatus: string | null;
  disputeSubject: string | null;
}

interface PayoutRow {
  hostId: string;
  hostName: string;
  period: string;
  bookingCount: number;
  amount: number;
  commissionReceivable: number;
  status: string;
  paidAt: string | null;
  paidBy: string | null;
}

interface ChartRow {
  month?: string;
  province?: string;
  propertyType?: string;
  grossBookingValue: number;
  netRevenue: number;
  refundAmount?: number;
  hostPayout?: number;
  bookings?: number;
}

interface RevenueData {
  generatedAt: string;
  period: string;
  snapshot?: boolean;
  summary: RevenueSummary;
  charts: {
    monthly: ChartRow[];
    byProvince: ChartRow[];
    byPropertyType: ChartRow[];
  };
  settlements: SettlementRow[];
  bookingDetails: BookingDetail[];
  refunds: BookingDetail[];
  disputes: BookingDetail[];
  payouts: PayoutRow[];
}

const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: "settlements", label: "Settlement", icon: <ReceiptText size={16} /> },
  { key: "refunds", label: "Refund", icon: <RefreshCw size={16} /> },
  { key: "payouts", label: "Payout", icon: <HandCoins size={16} /> },
  { key: "bookings", label: "Booking detail", icon: <FileSpreadsheet size={16} /> },
];

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

function formatPercent(value: number) {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    READY_FOR_PAYOUT: "Ready for Payout",
    PENDING_SETTLEMENT: "Pending Settlement",
    WAITING_SETTLEMENT: "Chờ quyết toán",
    REFUND_PENDING: "Chờ hoàn tiền",
    REFUNDED: "Refunded",
    READY: "Ready",
    PENDING: "Pending",
    PAID_OUT: "Paid Out",
    PAID: "Paid",
  };
  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "PAID" || status === "PAID_OUT") return "bg-emerald-600 text-white ring-emerald-600";
  if (status === "READY_FOR_PAYOUT" || status === "READY") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "PENDING_SETTLEMENT" || status === "PENDING") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "REFUND_PENDING") return "bg-sky-50 text-sky-700 ring-sky-100";
  if (status === "REFUNDED") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-slate-50 text-slate-600 ring-slate-100";
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadExcel(data: RevenueData) {
  const makeRows = (rows: Array<Array<string | number | null | undefined>>) =>
    rows
      .map((row) => `<Row>${row.map((cell) => {
        const isNumber = typeof cell === "number" && Number.isFinite(cell);
        return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeXml(cell)}</Data></Cell>`;
      }).join("")}</Row>`)
      .join("");

  const sheet = (name: string, rows: Array<Array<string | number | null | undefined>>) => `
    <Worksheet ss:Name="${escapeXml(name)}">
      <Table>${makeRows(rows)}</Table>
    </Worksheet>`;

  const workbook = `<?xml version="1.0"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    ${sheet("Settlement Summary", [
      ["Mã Host", "Tên Host", "Kỳ thanh toán", "Tổng Booking", "Tổng doanh thu", "Booking hoàn tiền", "Giá trị hoàn tiền", "Booking tranh chấp", "Hoa hồng TripNest", "Điều chỉnh", "Host thực nhận", "Commission Receivable", "Trạng thái", "Ngày thanh toán"],
      ...data.settlements.map((row) => [
        row.hostId,
        row.hostName,
        row.period,
        row.bookingCount,
        row.grossAmount,
        data.refunds.filter((refund) => refund.hostId === row.hostId).length,
        row.refundAmount,
        row.disputeCount,
        row.commission,
        row.adjustment,
        row.hostPayout,
        row.commissionReceivable,
        statusLabel(row.status),
        "",
      ]),
    ])}
    ${sheet("Booking Detail", [
      ["Booking", "Host", "Khách", "Chỗ ở", "Tỉnh", "Loại hình", "Check-in", "Check-out", "Thanh toán", "Gross", "Refund", "Commission", "Host Payout", "Commission Receivable", "Trạng thái"],
      ...data.bookingDetails.map((row) => [
        row.code,
        row.hostName,
        row.guest,
        row.property,
        row.province,
        row.propertyType,
        row.checkIn,
        row.checkOut,
        row.paymentModel,
        row.grossAmount,
        row.refundAmount,
        row.commission,
        row.hostPayout,
        row.commissionReceivable,
        statusLabel(row.payoutStatus),
      ]),
    ])}
    ${sheet("Refund Detail", [
      ["Booking", "Khách", "Host", "Số tiền", "Lý do", "Trạng thái", "Ngày hoàn"],
      ...data.refunds.map((row) => [
        row.code,
        row.guest,
        row.hostName,
        row.refundAmount,
        row.disputeSubject ?? "Hủy trước hạn miễn phí",
        row.refundStatus === "REFUNDED" ? "Đã hoàn tiền" : "Chờ xử lý",
        row.refundedAt ? new Date(row.refundedAt).toLocaleString("vi-VN") : "",
      ]),
    ])}
    ${sheet("Dispute Detail", [
      ["Booking", "Khách", "Host", "Chỗ ở", "Số tiền", "Trạng thái", "Nội dung"],
      ...data.disputes.map((row) => [row.code, row.guest, row.hostName, row.property, row.grossAmount, row.disputeStatus, row.disputeSubject]),
    ])}
    ${sheet("Payout History", [
      ["Host", "Kỳ thanh toán", "Booking", "Số tiền", "Commission Receivable", "Trạng thái", "Ngày thanh toán", "Người thực hiện"],
      ...data.payouts.map((row) => [row.hostName, row.period, row.bookingCount, row.amount, row.commissionReceivable, row.status, row.paidAt, row.paidBy]),
    ])}
    ${sheet("Revenue by Province", [
      ["Tỉnh/thành phố", "Booking", "Gross Booking Value", "Net Revenue"],
      ...data.charts.byProvince.map((row) => [row.province, row.bookings, row.grossBookingValue, row.netRevenue]),
    ])}
    ${sheet("Revenue by Property Type", [
      ["Loại hình", "Booking", "Gross Booking Value", "Net Revenue"],
      ...data.charts.byPropertyType.map((row) => [row.propertyType, row.bookings, row.grossBookingValue, row.netRevenue]),
    ])}
  </Workbook>`;

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tripnest-settlement-${data.period}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function RevenueManagementPage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("settlements");
  const [localPaidHosts, setLocalPaidHosts] = useState<Record<string, boolean>>({});
  const [payingHosts, setPayingHosts] = useState<Record<string, boolean>>({});
  const [generatingSettlement, setGeneratingSettlement] = useState(false);

  useEffect(() => {
    api
      .get("/admin/revenue")
      .then((response) => {
        const payload = response.data.data ?? null;
        setData(payload);
        const paidHosts = Object.fromEntries(
          ((payload?.payouts ?? []) as PayoutRow[])
            .filter((row) => row.status === "PAID")
            .map((row) => [row.hostId, true])
        );
        setLocalPaidHosts(paidHosts);
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? "Không thể tải dữ liệu doanh thu."))
      .finally(() => setLoading(false));
  }, []);

  const maxMonthlyValue = useMemo(() => {
    if (!data?.charts.monthly.length) return 1;
    return Math.max(...data.charts.monthly.map((row) => Math.max(row.grossBookingValue, row.hostPayout ?? 0, row.netRevenue)), 1);
  }, [data]);

  async function markPayoutPaid(row: { hostId: string; period: string; bookingCount: number; amount: number; commissionReceivable: number }) {
    setPayingHosts((current) => ({ ...current, [row.hostId]: true }));
    try {
      const response = await api.post(`/admin/revenue/payouts/${row.hostId}/paid`, {
        period: row.period,
        amount: row.amount,
        bookingCount: row.bookingCount,
        commissionReceivable: row.commissionReceivable,
      });
      const paid = response.data.data;
      setLocalPaidHosts((current) => ({ ...current, [row.hostId]: true }));
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          payouts: current.payouts.map((payout) => (
            payout.hostId === row.hostId
              ? { ...payout, status: "PAID", paidAt: paid?.paidAt ?? new Date().toISOString(), paidBy: paid?.paidBy ?? null }
            : payout
          )),
        };
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? "Không thể đánh dấu payout đã thanh toán.");
    } finally {
      setPayingHosts((current) => ({ ...current, [row.hostId]: false }));
    }
  }

  async function generateSettlement() {
    if (!data?.period) return;
    setGeneratingSettlement(true);
    setError(null);
    try {
      const response = await api.post("/admin/revenue/settlements/generate", {
        period: data.period,
      });
      const payload = response.data.data ?? null;
      setData(payload);
      const paidHosts = Object.fromEntries(
        ((payload?.payouts ?? []) as PayoutRow[])
          .filter((row) => row.status === "PAID")
          .map((row) => [row.hostId, true])
      );
      setLocalPaidHosts(paidHosts);
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? "KhÃ´ng thá»ƒ sinh ká»³ settlement.");
    } finally {
      setGeneratingSettlement(false);
    }
  }

  if (loading) {
    return (
      <PortalShell title="Doanh thu">
        <div className="portal-card flex h-72 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-transparent" />
        </div>
      </PortalShell>
    );
  }

  if (error || !data) {
    return (
      <PortalShell title="Doanh thu">
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error ?? "Chưa có dữ liệu doanh thu."}
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell title="Doanh thu">
      <div className="space-y-6">
        <section className="rounded-lg bg-[#103f3b] p-5 text-white shadow-sm shadow-teal-950/10">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">Settlement & Payout</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Quản lý dòng tiền OTA</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">
                Đối soát booking hoàn thành, hủy có tính phí, hoàn tiền, tranh chấp, hoa hồng và khoản phải trả Host trong một luồng quản trị.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generateSettlement}
                disabled={generatingSettlement || Boolean(data.snapshot)}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <ReceiptText size={17} />
                {data.snapshot ? "Kỳ đã khóa" : generatingSettlement ? "Đang khóa..." : "Khóa kỳ settlement"}
              </button>
              <button
                type="button"
                onClick={() => downloadExcel(data)}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-amber-400 px-4 text-sm font-semibold text-teal-950 transition hover:bg-amber-300"
              >
                <Download size={17} />
                Xuất Excel
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard icon={<CircleDollarSign size={20} />} label="Gross Booking Value" value={formatVnd(data.summary.grossBookingValue)} />
          <KpiCard icon={<WalletCards size={20} />} label="Net Revenue TripNest" value={formatVnd(data.summary.netRevenue)} tone="teal" />
          <KpiCard icon={<Banknote size={20} />} label="Pending Payout" value={formatVnd(data.summary.pendingPayout)} />
          <KpiCard icon={<RefreshCw size={20} />} label="Total Refund" value={formatVnd(data.summary.totalRefund)} tone="amber" />
          <KpiCard icon={<ShieldAlert size={20} />} label="Booking tranh chấp" value={data.summary.disputedBookings.toLocaleString("vi-VN")} />
          <KpiCard icon={<Clock3 size={20} />} label="Booking chờ quyết toán" value={data.summary.waitingSettlementBookings.toLocaleString("vi-VN")} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="portal-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Dòng tiền theo tháng</h3>
                <p className="mt-1 text-xs text-slate-500">Gross, Net Revenue, Refund và Host Payout.</p>
              </div>
              <span className="rounded bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                Hủy {formatPercent(data.summary.cancellationRate)} · Hoàn {formatPercent(data.summary.refundRate)}
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {data.charts.monthly.map((row) => (
                <div key={row.month} className="grid gap-2 sm:grid-cols-[84px_1fr] sm:items-center">
                  <span className="text-xs font-semibold text-slate-500">{row.month}</span>
                  <div className="space-y-1.5">
                    <Bar label="Gross" value={row.grossBookingValue} max={maxMonthlyValue} tone="teal" />
                    <Bar label="Net" value={row.netRevenue} max={maxMonthlyValue} tone="amber" />
                    <Bar label="Refund" value={row.refundAmount ?? 0} max={maxMonthlyValue} tone="rose" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="portal-card p-5">
            <h3 className="text-lg font-semibold text-slate-950">Doanh thu theo tỉnh</h3>
            <div className="mt-4 space-y-3">
              {data.charts.byProvince.slice(0, 6).map((row) => (
                <RankRow key={row.province} label={row.province ?? "Không rõ"} value={row.grossBookingValue} total={data.summary.grossBookingValue} />
              ))}
            </div>
          </div>
        </section>

        <section className="portal-card overflow-hidden">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={clsx(
                    "inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition",
                    activeTab === tab.key ? "bg-teal-800 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400">Cập nhật: {new Date(data.generatedAt).toLocaleString("vi-VN")}</span>
          </div>

          {activeTab === "settlements" ? <SettlementTable rows={data.settlements} localPaidHosts={localPaidHosts} payingHosts={payingHosts} onMarkPaid={markPayoutPaid} /> : null}
          {activeTab === "refunds" ? <RefundTable rows={data.refunds} /> : null}
          {activeTab === "payouts" ? <PayoutTable rows={data.payouts} localPaidHosts={localPaidHosts} payingHosts={payingHosts} onMarkPaid={markPayoutPaid} /> : null}
          {activeTab === "bookings" ? <BookingTable rows={data.bookingDetails} /> : null}
        </section>
      </div>
    </PortalShell>
  );
}

function KpiCard({ icon, label, value, tone = "slate" }: { icon: React.ReactNode; label: string; value: string; tone?: "slate" | "teal" | "amber" }) {
  return (
    <div className={clsx(
      "rounded-lg border p-4 shadow-sm",
      tone === "teal" ? "border-teal-100 bg-teal-50" : tone === "amber" ? "border-amber-100 bg-amber-50" : "border-slate-100 bg-white"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className={clsx(
          "grid h-10 w-10 shrink-0 place-items-center rounded-md",
          tone === "teal" ? "bg-teal-800 text-white" : tone === "amber" ? "bg-amber-400 text-teal-950" : "bg-slate-100 text-slate-700"
        )}>
          {icon}
        </span>
      </div>
    </div>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: "teal" | "amber" | "rose" }) {
  const colors = {
    teal: "bg-teal-700",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
  };
  return (
    <div className="grid grid-cols-[54px_1fr_112px] items-center gap-2">
      <span className="text-[11px] font-semibold text-slate-400">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={clsx("h-full rounded-full", colors[tone])} style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
      </div>
      <span className="text-right text-xs font-semibold text-slate-600">{formatVnd(value)}</span>
    </div>
  );
}

function RankRow({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-slate-700">{label}</span>
        <span className="shrink-0 font-semibold text-slate-950">{formatVnd(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-700" style={{ width: `${Math.max(2, total ? (value / total) * 100 : 0)}%` }} />
      </div>
    </div>
  );
}

function SettlementTable({
  rows,
  localPaidHosts,
  payingHosts,
  onMarkPaid,
}: {
  rows: SettlementRow[];
  localPaidHosts: Record<string, boolean>;
  payingHosts: Record<string, boolean>;
  onMarkPaid: (row: { hostId: string; period: string; bookingCount: number; amount: number; commissionReceivable: number }) => Promise<void>;
}) {
  return (
    <TableWrap empty={rows.length === 0} emptyText="Chưa có settlement.">
      <table className="w-full min-w-[1040px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>Host</Th>
            <Th>Booking</Th>
            <Th align="right">Doanh thu</Th>
            <Th align="right">Refund</Th>
            <Th align="right">Hoa hồng</Th>
            <Th align="right">Host nhận</Th>
            <Th align="right">Commission thu</Th>
            <Th>Trạng thái</Th>
            <Th align="right">Thao tác</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const paid = localPaidHosts[row.hostId];
            const paying = payingHosts[row.hostId];
            return (
              <tr key={row.hostId} className="border-t border-slate-50">
                <Td>
                  <p className="font-semibold text-slate-900">{row.hostName}</p>
                  <p className="mt-1 text-xs text-slate-400">{row.hostEmail}</p>
                </Td>
                <Td>{row.bookingCount}</Td>
                <Td align="right">{formatVnd(row.grossAmount)}</Td>
                <Td align="right">{formatVnd(row.refundAmount)}</Td>
                <Td align="right">{formatVnd(row.commission)}</Td>
                <Td align="right" strong>{formatVnd(row.hostPayout)}</Td>
                <Td align="right">{formatVnd(row.commissionReceivable)}</Td>
                <Td><Badge status={paid ? "PAID" : row.status} label={paid ? "Paid Out" : statusLabel(row.status)} /></Td>
                <Td align="right">
                  <button
                    type="button"
                    onClick={() => onMarkPaid({ hostId: row.hostId, period: row.period, bookingCount: row.bookingCount, amount: row.hostPayout, commissionReceivable: row.commissionReceivable })}
                    disabled={paid || paying || row.hostPayout <= 0}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-teal-800 px-3 text-xs font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    <CheckCircle2 size={14} />
                    {paying ? "Đang lưu..." : "Đã thanh toán"}
                  </button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrap>
  );
}

function RefundTable({ rows }: { rows: BookingDetail[] }) {
  return (
    <TableWrap empty={rows.length === 0} emptyText="Chưa có booking cần hoàn tiền.">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>Booking</Th>
            <Th>Khách</Th>
            <Th>Host</Th>
            <Th align="right">Số tiền</Th>
            <Th>Lý do</Th>
            <Th>Trạng thái</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-50">
              <Td strong>{row.code}</Td>
              <Td>{row.guest}</Td>
              <Td>{row.hostName}</Td>
              <Td align="right" strong>{formatVnd(row.refundAmount)}</Td>
              <Td>{row.disputeSubject ?? "Hủy trước hạn miễn phí"}</Td>
              <Td><Badge status={row.refundStatus === "REFUNDED" ? "REFUNDED" : "REFUND_PENDING"} label={row.refundStatus === "REFUNDED" ? "Đã hoàn tiền" : "Chờ xử lý"} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

function PayoutTable({
  rows,
  localPaidHosts,
  payingHosts,
  onMarkPaid,
}: {
  rows: PayoutRow[];
  localPaidHosts: Record<string, boolean>;
  payingHosts: Record<string, boolean>;
  onMarkPaid: (row: { hostId: string; period: string; bookingCount: number; amount: number; commissionReceivable: number }) => Promise<void>;
}) {
  return (
    <TableWrap empty={rows.length === 0} emptyText="Chưa có payout.">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>Host</Th>
            <Th>Kỳ thanh toán</Th>
            <Th>Booking</Th>
            <Th align="right">Số tiền</Th>
            <Th align="right">Commission thu</Th>
            <Th>Trạng thái</Th>
            <Th align="right">Thao tác</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const paid = localPaidHosts[row.hostId] || row.status === "PAID";
            const paying = payingHosts[row.hostId];
            return (
              <tr key={row.hostId} className="border-t border-slate-50">
                <Td strong>{row.hostName}</Td>
                <Td>{row.period}</Td>
                <Td>{row.bookingCount}</Td>
                <Td align="right" strong>{formatVnd(row.amount)}</Td>
                <Td align="right">{formatVnd(row.commissionReceivable)}</Td>
                <Td><Badge status={paid ? "PAID" : row.status} label={paid ? "Paid" : statusLabel(row.status)} /></Td>
                <Td align="right">
                  <button
                    type="button"
                    onClick={() => onMarkPaid(row)}
                    disabled={paid || paying || row.amount <= 0}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-teal-800 px-3 text-xs font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    <ArrowDownToLine size={14} />
                    {paying ? "Đang lưu..." : "Đã thanh toán"}
                  </button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrap>
  );
}

function BookingTable({ rows }: { rows: BookingDetail[] }) {
  return (
    <TableWrap empty={rows.length === 0} emptyText="Chưa có booking.">
      <table className="w-full min-w-[1180px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>Booking</Th>
            <Th>Host</Th>
            <Th>Khách</Th>
            <Th>Chỗ ở</Th>
            <Th>Thanh toán</Th>
            <Th align="right">Gross</Th>
            <Th align="right">Hoa hồng</Th>
            <Th align="right">Host Payout</Th>
            <Th align="right">Commission thu</Th>
            <Th>Trạng thái</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-50">
              <Td strong>{row.code}</Td>
              <Td>{row.hostName}</Td>
              <Td>{row.guest}</Td>
              <Td>
                <p className="max-w-[240px] truncate font-medium text-slate-900">{row.property}</p>
                <p className="mt-1 text-xs text-slate-400">{row.province} · {row.propertyType}</p>
              </Td>
              <Td>{row.paymentModel}</Td>
              <Td align="right">{formatVnd(row.grossAmount)}</Td>
              <Td align="right">{formatVnd(row.commission)}</Td>
              <Td align="right" strong>{formatVnd(row.hostPayout)}</Td>
              <Td align="right">{formatVnd(row.commissionReceivable)}</Td>
              <Td><Badge status={row.payoutStatus} label={statusLabel(row.payoutStatus)} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

function TableWrap({ children, empty, emptyText }: { children: React.ReactNode; empty: boolean; emptyText: string }) {
  if (empty) return <div className="py-14 text-center text-sm font-medium text-slate-400">{emptyText}</div>;
  return <div className="overflow-x-auto">{children}</div>;
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={clsx("px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", align === "right" ? "text-right" : "text-left")}>{children}</th>;
}

function Td({ children, align = "left", strong = false }: { children: React.ReactNode; align?: "left" | "right"; strong?: boolean }) {
  return <td className={clsx("px-5 py-4 align-middle text-slate-600", align === "right" && "text-right", strong && "font-semibold text-slate-950")}>{children}</td>;
}

function Badge({ status, label }: { status: string; label: string }) {
  const paidClass = status === "PAID" ? "bg-emerald-600 text-white ring-emerald-600" : statusClass(status);
  return <span className={clsx("inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1", paidClass)}>{label}</span>;
}
