/**
 * EMPLOYEE ENGINE
 * Professional employee profile management — CRUD, search, filtering,
 * pay rate resolution, and profile completeness tracking.
 */

import { supabase, type Profile, type PayRate, type JobAssignment } from "@/lib/supabase";
import { logActivity } from "./activity";

// ── Types ────────────────────────────────────────────────────────────────────

export type EmploymentType = "employee" | "contractor" | "temp";
export type EmploymentStatus = "active" | "inactive" | "terminated" | "on_leave" | "probation";

export interface CreateEmployeeInput {
  full_name: string;
  email?: string;
  phone?: string;
  role?: string;
  company_id?: string;
  hire_date?: string;
  employment_type?: EmploymentType;
  default_pay_rate?: number;
  overtime_rule?: string;
  overtime_threshold?: number;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  certifications?: string[];
  skill_tags?: string[];
  employee_notes?: string;
}

export interface UpdateEmployeeInput {
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  hire_date?: string;
  employment_type?: EmploymentType;
  employment_status?: EmploymentStatus;
  default_pay_rate?: number;
  overtime_rule?: string;
  overtime_threshold?: number;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  certifications?: string[];
  skill_tags?: string[];
  employee_notes?: string;
  avatar_url?: string;
  is_active?: boolean;
}

export interface EmployeeFilter {
  search?: string;
  role?: string;
  employment_status?: EmploymentStatus;
  employment_type?: EmploymentType;
  crew_id?: string;
  company_id?: string;
  has_certification?: string;
  has_skill?: string;
}

export interface EmployeeWithDetails extends Profile {
  current_rate?: PayRate | null;
  active_jobs?: JobAssignment[];
  crew_name?: string | null;
}

// ── CRUD Operations ──────────────────────────────────────────────────────────

export async function createEmployee(input: CreateEmployeeInput): Promise<Profile> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      full_name: input.full_name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      role: input.role ?? "employee",
      company_id: input.company_id ?? null,
      hire_date: input.hire_date ?? new Date().toISOString().split("T")[0],
      employment_type: input.employment_type ?? "employee",
      employment_status: "active",
      default_pay_rate: input.default_pay_rate ?? null,
      overtime_rule: input.overtime_rule ?? "standard",
      overtime_threshold: input.overtime_threshold ?? 40,
      address: input.address ?? null,
      emergency_contact_name: input.emergency_contact_name ?? null,
      emergency_contact_phone: input.emergency_contact_phone ?? null,
      certifications: input.certifications ?? [],
      skill_tags: input.skill_tags ?? [],
      employee_notes: input.employee_notes ?? null,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  logActivity({
    action: "user_created",
    resource_type: "profile",
    resource_id: data.id,
    new_data: { full_name: input.full_name, role: input.role },
  });
  return data as Profile;
}

export async function updateEmployee(id: string, updates: UpdateEmployeeInput): Promise<Profile> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  logActivity({
    action: "employee_updated",
    resource_type: "profile",
    resource_id: id,
    new_data: updates as Record<string, unknown>,
  });
  return data as Profile;
}

export async function getEmployee(id: string): Promise<EmployeeWithDetails | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as EmployeeWithDetails;
}

export async function getEmployees(filter?: EmployeeFilter): Promise<Profile[]> {
  if (!supabase) return [];

  let query = supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  if (filter?.company_id) query = query.eq("company_id", filter.company_id);
  if (filter?.role) query = query.eq("role", filter.role);
  if (filter?.employment_status) query = query.eq("employment_status", filter.employment_status);
  if (filter?.employment_type) query = query.eq("employment_type", filter.employment_type);

  if (filter?.search) {
    query = query.or(`full_name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,phone.ilike.%${filter.search}%`);
  }

  const { data } = await query;
  return (data ?? []) as Profile[];
}

// ── Pay Rate Resolution ──────────────────────────────────────────────────────

/** Get the current effective pay rate for an employee, optionally for a specific job */
export async function getCurrentPayRate(
  employeeId: string,
  jobId?: string
): Promise<PayRate | null> {
  if (!supabase) return null;
  const today = new Date().toISOString().split("T")[0];

  // First check for job-specific rate
  if (jobId) {
    const { data: jobRate } = await supabase
      .from("pay_rates")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("job_id", jobId)
      .lte("effective_date", today)
      .or("end_date.is.null,end_date.gte." + today)
      .order("effective_date", { ascending: false })
      .limit(1)
      .single();
    if (jobRate) return jobRate as PayRate;
  }

  // Fall back to default rate (no job_id)
  const { data: defaultRate } = await supabase
    .from("pay_rates")
    .select("*")
    .eq("employee_id", employeeId)
    .is("job_id", null)
    .lte("effective_date", today)
    .or("end_date.is.null,end_date.gte." + today)
    .order("effective_date", { ascending: false })
    .limit(1)
    .single();

  return (defaultRate as PayRate) ?? null;
}

/** Get full pay rate history for an employee */
export async function getPayRateHistory(employeeId: string): Promise<PayRate[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("pay_rates")
    .select("*, job_sites(name)")
    .eq("employee_id", employeeId)
    .order("effective_date", { ascending: false });
  return (data ?? []) as PayRate[];
}

/** Create a new pay rate entry */
export async function setPayRate(input: {
  employee_id: string;
  rate: number;
  rate_type?: string;
  effective_date?: string;
  job_id?: string;
  created_by?: string;
  notes?: string;
}): Promise<PayRate> {
  if (!supabase) throw new Error("Supabase not configured");

  // Close any existing open rate for this employee+job combo
  const today = input.effective_date ?? new Date().toISOString().split("T")[0];
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - 1);

  let closeQuery = supabase
    .from("pay_rates")
    .update({ end_date: endDate.toISOString().split("T")[0] })
    .eq("employee_id", input.employee_id)
    .is("end_date", null);

  if (input.job_id) {
    closeQuery = closeQuery.eq("job_id", input.job_id);
  } else {
    closeQuery = closeQuery.is("job_id", null);
  }
  await closeQuery;

  // Insert new rate
  const { data, error } = await supabase
    .from("pay_rates")
    .insert({
      employee_id: input.employee_id,
      rate: input.rate,
      rate_type: input.rate_type ?? "hourly",
      effective_date: today,
      job_id: input.job_id ?? null,
      created_by: input.created_by ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // Also update default_pay_rate on profile if this is a default rate
  if (!input.job_id) {
    await supabase
      .from("profiles")
      .update({ default_pay_rate: input.rate, updated_at: new Date().toISOString() })
      .eq("id", input.employee_id);
  }

  return data as PayRate;
}

// ── Job Assignments ──────────────────────────────────────────────────────────

export async function getJobAssignments(
  employeeId: string,
  activeOnly = false
): Promise<JobAssignment[]> {
  if (!supabase) return [];
  let query = supabase
    .from("job_assignments")
    .select("*, job_sites(name, address, status)")
    .eq("employee_id", employeeId)
    .order("assigned_date", { ascending: false });

  if (activeOnly) query = query.eq("is_active", true);

  const { data } = await query;
  return (data ?? []) as JobAssignment[];
}

export async function assignEmployeeToJob(input: {
  employee_id: string;
  job_id: string;
  role_on_job?: string;
  assigned_by?: string;
  notes?: string;
}): Promise<JobAssignment> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("job_assignments")
    .insert({
      employee_id: input.employee_id,
      job_id: input.job_id,
      role_on_job: input.role_on_job ?? "installer",
      assigned_by: input.assigned_by ?? null,
      notes: input.notes ?? null,
    })
    .select("*, job_sites(name, address, status)")
    .single();
  if (error) throw error;
  return data as JobAssignment;
}

export async function endJobAssignment(assignmentId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("job_assignments")
    .update({
      is_active: false,
      end_date: new Date().toISOString().split("T")[0],
    })
    .eq("id", assignmentId);
}

// ── Profile Completeness ─────────────────────────────────────────────────────

/** Calculate how complete an employee profile is (0–100) */
export function profileCompleteness(profile: Profile): number {
  const fields = [
    profile.full_name,
    profile.email,
    profile.phone,
    profile.role,
    profile.hire_date,
    profile.employment_type,
    profile.default_pay_rate,
    profile.address,
    profile.emergency_contact_name,
    profile.emergency_contact_phone,
  ];
  const filled = fields.filter((f) => f !== null && f !== undefined && f !== "").length;
  return Math.round((filled / fields.length) * 100);
}

// ── Employee Stats ───────────────────────────────────────────────────────────

export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  on_leave: number;
  contractors: number;
  employees: number;
}

export async function getEmployeeStats(companyId?: string): Promise<EmployeeStats> {
  if (!supabase) return { total: 0, active: 0, inactive: 0, on_leave: 0, contractors: 0, employees: 0 };

  let query = supabase.from("profiles").select("employment_status, employment_type");
  if (companyId) query = query.eq("company_id", companyId);

  const { data } = await query;
  if (!data) return { total: 0, active: 0, inactive: 0, on_leave: 0, contractors: 0, employees: 0 };

  return {
    total: data.length,
    active: data.filter((p) => p.employment_status === "active" || (!p.employment_status)).length,
    inactive: data.filter((p) => p.employment_status === "inactive" || p.employment_status === "terminated").length,
    on_leave: data.filter((p) => p.employment_status === "on_leave").length,
    contractors: data.filter((p) => p.employment_type === "contractor").length,
    employees: data.filter((p) => p.employment_type === "employee" || !p.employment_type).length,
  };
}
