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
  subject: string;
  description: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "ESCALATED";
  resolution?: string;
  createdAt: string;
  host: { email: string };
  guest: { email: string };
  resolver?: { email: string };
  province?: { name: string };
  booking?: {
    id: string;
    status: string;
    paymentStatus: string;
    checkIn: string | null;
    checkOut: string | null;
    property?: { id: string; title: string; city: string } | null;
  } | null;
}
