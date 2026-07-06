export type Role = "ADMIN" | "OPERATOR_PROVINCE" | "OPERATOR_SUB";

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  avatar?: string;
}

export interface Province {
  id: string;
  name: string;
  code: string;
  type: "TINH" | "THANH_PHO";
  operatorAssignments?: { operator: { id: string; email: string } }[];
}

export interface Operator {
  id: string;
  email: string;
  phone?: string;
  role: "OPERATOR_PROVINCE" | "OPERATOR_SUB";
  isActive: boolean;
  createdAt: string;
  operatorAssignments?: { province: Province }[];
}

export interface Listing {
  id: string;
  title: string;
  city: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
  type: string;
  pricePerNight?: number;
  host: { id: string; email: string };
  images?: { url: string }[];
  createdAt: string;
}

export interface HostApprovalRequest {
  id: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  notes?: string;
  createdAt: string;
  user: { id: string; email: string; phone?: string };
  province?: { name: string };
  reviewer?: { email: string };
}

export interface OperatorTask {
  id: string;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  dueDate?: string;
  completedAt?: string;
  reportNotes?: string;
  reportResult?: string;
  entityType?: string;
  entityId?: string;
  assignee?: { email: string };
  assigner?: { email: string };
  province?: { name: string };
  createdAt: string;
}

export interface Dispute {
  id: string;
  bookingId?: string | null;
  bookingCode?: string;
  subject: string;
  description: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "ESCALATED";
  reporter?: string;
  category?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  requestedOutcome?: string | null;
  decision?: string | null;
  resolution?: string;
  refundAdjustment?: number;
  payoutAdjustment?: number;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  escalatedAt?: string | null;
  host: { id?: string; email: string; name?: string | null; displayName?: string | null; phone?: string | null };
  guest: { id?: string; email: string; name?: string | null; displayName?: string | null; phone?: string | null };
  resolver?: { id?: string; email: string; name?: string | null } | null;
  province?: { id?: string; name: string } | null;
  operatorNotes?: Array<Record<string, unknown>>;
  sla?: { ageHours: number; dueAt: string; overdue: boolean; label: string };
  booking?: {
    id: string;
    code: string;
    status: string;
    statusLabel: string;
    checkIn: string | null;
    checkOut: string | null;
    guests: number;
    totalPrice: number;
    paymentStatus: string;
    paymentStatusLabel: string;
    paymentMethod: string | null;
    paymentMethodLabel: string;
    paidAmount: number;
    property: { id: string; title: string; city: string; pricePerNight: number } | null;
  } | null;
  financialImpact?: {
    grossAmount: number;
    settlementHold: boolean;
    refundAdjustment: number;
    payoutAdjustment: number;
    operatorDecisionRequired: boolean;
    suggestion: string;
  };
}
