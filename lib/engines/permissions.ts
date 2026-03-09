/**
 * PERMISSION ENGINE
 * Role-Based Access Control (RBAC) for the Jobsite Operating System.
 * Centrally defines what each role is allowed to do.
 */

export type UserRole =
  | "CreativeEditor"   // Platform root / developer account
  | "company_owner"    // Company admin
  | "field_manager"    // Field supervisor
  | "employee";        // Regular field worker

export type Permission =
  | "create_job"
  | "edit_job"
  | "delete_job"
  | "manage_employees"
  | "view_employees"
  | "view_reports"
  | "log_time"
  | "manage_companies"
  | "view_activity_log"
  | "manage_settings"
  | "create_journal"
  | "delete_journal"
  | "manage_crews"
  | "upload_files"
  | "manage_notifications"
  | "view_analytics"
  | "configure_automation"
  | "access_assistant"
  | "manage_pay_rates"
  | "approve_time"
  | "view_payroll"
  | "manage_payroll";

// Full permission matrix - each role gets an explicit list
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  CreativeEditor: [
    "create_job", "edit_job", "delete_job",
    "manage_employees", "view_employees", "view_reports", "log_time",
    "manage_companies", "view_activity_log", "manage_settings",
    "create_journal", "delete_journal", "manage_crews",
    "upload_files", "manage_notifications", "view_analytics",
    "configure_automation", "access_assistant",
    "manage_pay_rates", "approve_time", "view_payroll", "manage_payroll",
  ],
  company_owner: [
    "create_job", "edit_job", "delete_job",
    "manage_employees", "view_employees", "view_reports", "log_time",
    "view_activity_log", "manage_settings",
    "create_journal", "delete_journal", "manage_crews",
    "upload_files", "manage_notifications", "view_analytics",
    "manage_pay_rates", "approve_time", "view_payroll", "manage_payroll",
  ],
  field_manager: [
    "create_job", "edit_job",
    "view_employees", "view_reports", "log_time",
    "view_activity_log",
    "create_journal", "manage_crews",
    "upload_files", "approve_time",
  ],
  employee: [
    "log_time",
    "create_journal",
    "upload_files",
  ],
};

/** Check if a role has a specific permission */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Get all permissions for a role */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/** Returns true for CreativeEditor or company_owner */
export function isAdminRole(role: UserRole): boolean {
  return role === "CreativeEditor" || role === "company_owner";
}

/** Returns true for field_manager and above */
export function isManagerOrAbove(role: UserRole): boolean {
  return role === "CreativeEditor" || role === "company_owner" || role === "field_manager";
}

/** Map legacy role strings (from existing profiles) to new UserRole */
export function normalizeRole(raw: string): UserRole {
  const map: Record<string, UserRole> = {
    CreativeEditor: "CreativeEditor",
    company_owner: "company_owner",
    owner: "company_owner",
    field_manager: "field_manager",
    foreman: "field_manager",
    installer: "employee",
    laborer: "employee",
    employee: "employee",
  };
  return map[raw] ?? "employee";
}
