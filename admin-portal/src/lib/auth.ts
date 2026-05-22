import type { Role } from "@/types";

export function getRedirectPath(role: Role): string {
  switch (role) {
    case "ADMIN": return "/admin/dashboard";
    case "OPERATOR_PROVINCE": return "/operator/dashboard";
    case "OPERATOR_SUB": return "/operator/tasks";
    default: return "/login";
  }
}

export function canAccess(role: Role | null | undefined, path: string): boolean {
  if (!role) return false;
  if (path.startsWith("/admin")) return role === "ADMIN";
  if (path.startsWith("/operator")) return role === "OPERATOR_PROVINCE" || role === "OPERATOR_SUB";
  return false;
}
