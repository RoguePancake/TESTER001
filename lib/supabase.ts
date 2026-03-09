import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>);

// ── Types ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  auth_id?: string | null;      // links to Supabase auth.users
  company_id?: string | null;
  full_name: string;
  email?: string | null;
  role: string;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  // Employee management fields (migration 005)
  phone?: string | null;
  hire_date?: string | null;
  employment_type?: "employee" | "contractor" | "temp";
  employment_status?: "active" | "inactive" | "terminated" | "on_leave" | "probation";
  default_pay_rate?: number | null;
  overtime_rule?: "standard" | "none" | "california" | "custom";
  overtime_threshold?: number | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  certifications?: string[];
  skill_tags?: string[];
  employee_notes?: string | null;
  updated_at?: string | null;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  job_name: string | null;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  notes: string | null;
  created_at: string;
  profiles?: Profile;
  // Employee management fields (migration 005)
  job_id?: string | null;
  pay_rate_snapshot?: number | null;
  overtime_rate_snapshot?: number | null;
  approved_by?: string | null;
  approved_at?: string | null;
  status?: "pending" | "approved" | "rejected" | "disputed";
  work_type?: string | null;
  travel_time?: number | null;
  weather?: string | null;
  equipment_used?: string | null;
  location_note?: string | null;
  sqft_completed?: number | null;
  materials_used?: string | null;
  updated_at?: string | null;
}

export interface DailyLog {
  id: string;
  log_date: string;
  job_name: string | null;
  weather_condition: string | null;
  work_summary: string;
  issues: string | null;
  materials_used: string | null;
  sqft_completed: number | null;
  created_at: string;
}

export interface Delivery {
  id: string;
  delivery_date: string;
  job_name: string | null;
  vendor: string;
  po_number: string | null;
  items_received: string;
  status: string;
  condition_notes: string | null;
  received_by: string | null;
  created_at: string;
}

export interface NafEntry {
  id: string;
  entry_type: string;
  body: string | null;
  job_name: string | null;
  user_id: string | null;
  ref_id: string | null;
  ref_table: string | null;
  metadata: Record<string, unknown>;
  pinned: boolean;
  created_at: string;
  naf_attachments?: NafAttachment[];
  profiles?: Profile;
}

export interface NafAttachment {
  id: string;
  entry_id: string;
  file_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  duration_sec: number | null;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export interface JobSite {
  id: string;
  name: string;
  address?: string | null;
  client_name?: string | null;
  status: string;
  notes?: string | null;
  company_id?: string | null;
  assigned_crew_id?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  job_name: string;
  check_date: string;
  checklist_type: string;
  item_label: string;
  checked_by: string | null;
  checked_at: string | null;
}

// ── New types added by migration 004 ─────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string | null;
  max_employees: number;
  is_active: boolean;
  created_at: string;
}

export interface Crew {
  id: string;
  company_id: string | null;
  name: string;
  foreman_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CrewMember {
  id: string;
  crew_id: string;
  user_id: string;
  joined_at: string;
  crew_role?: "member" | "lead" | "foreman" | "apprentice";
}

// ── Employee Management types (migration 005) ────────────────────────────────

export interface PayRate {
  id: string;
  employee_id: string;
  rate: number;
  rate_type: "hourly" | "salary" | "flat" | "per_sqft";
  effective_date: string;
  end_date?: string | null;
  job_id?: string | null;
  created_by?: string | null;
  notes?: string | null;
  created_at: string;
  // Joined data
  job_sites?: JobSite;
  profiles?: Profile;
}

export interface JobAssignment {
  id: string;
  employee_id: string;
  job_id: string;
  role_on_job: string;
  assigned_date: string;
  end_date?: string | null;
  assigned_by?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  // Joined data
  job_sites?: JobSite;
  profiles?: Profile;
}

export interface PayrollSummary {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  regular_hours: number;
  overtime_hours: number;
  regular_rate: number;
  overtime_rate: number;
  gross_pay: number;
  total_entries: number;
  status: "draft" | "pending_review" | "approved" | "finalized" | "paid";
  notes?: string | null;
  finalized_by?: string | null;
  finalized_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  // Joined data
  profiles?: Profile;
}

export interface ActivityLog {
  id: string;
  company_id: string | null;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Named AppNotification to avoid shadowing the global DOM Notification type
export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  company_id: string | null;
  name: string;
  trigger: string;
  action: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}
