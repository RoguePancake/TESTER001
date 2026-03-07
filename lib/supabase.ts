import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Types ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  role: string;
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
