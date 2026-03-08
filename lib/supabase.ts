import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>);

// ── Types ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  auth_id: string | null;      // links to Supabase auth.users
  company_id: string | null;
  full_name: string;
  email: string | null;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
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
  address: string | null;
  client_name: string | null;
  status: string;
  notes: string | null;
  company_id: string | null;
  assigned_crew_id: string | null;
  created_by: string | null;
  updated_at: string | null;
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
