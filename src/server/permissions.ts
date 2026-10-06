import type { Role } from "@/domain/types";

export type Permission =
  | "case.read"
  | "case.contribute"
  | "case.manage"
  | "case.delete"
  | "org.manage"
  | "org.delete";

const MATRIX: Record<Role, Permission[]> = {
  owner: ["case.read", "case.contribute", "case.manage", "case.delete", "org.manage", "org.delete"],
  admin: ["case.read", "case.contribute", "case.manage", "case.delete", "org.manage"],
  strategist: ["case.read", "case.contribute", "case.manage", "case.delete"],
  analyst: ["case.read", "case.contribute"],
  viewer: ["case.read"],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}
