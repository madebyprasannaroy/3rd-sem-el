// Role and permission matrix: one place that says which role may do which action (used by API routes and tests).
export type Role = "customer" | "manufacturer" | "inspector";
export type Action =
  | "scan.create" | "scan.read.own" | "scan.read.all"
  | "image.upload" | "scan.extract" | "field.correct" | "audit.read";

// Permission table: each role maps to the list of actions it is allowed to perform.
const PERMISSIONS: Record<Role, readonly Action[]> = {
  customer: ["scan.create", "scan.read.own", "image.upload", "scan.extract", "field.correct"],
  manufacturer: ["scan.create", "scan.read.own", "image.upload", "scan.extract", "field.correct"],
  inspector: ["scan.create", "scan.read.own", "scan.read.all", "image.upload", "scan.extract", "field.correct", "audit.read"],
};

// Returns true when the role is allowed to do the action; unknown roles are always denied.
export function can(role: string | null | undefined, action: Action): boolean {
  if (!role || !(role in PERMISSIONS)) return false;
  return PERMISSIONS[role as Role].includes(action);
}

// Type guard: checks that a string coming from the database is one of the known roles.
export function isRole(value: unknown): value is Role {
  return value === "customer" || value === "manufacturer" || value === "inspector";
}
