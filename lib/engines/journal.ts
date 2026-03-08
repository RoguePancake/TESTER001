/**
 * JOURNAL ENGINE
 * Jobsite journal - daily notes, problems, materials, photos.
 * Extends the existing daily_logs / naf_entries system.
 */

import { supabase } from "@/lib/supabase";

export interface JournalEntry {
  id: string;
  job_id: string | null;
  job_name: string | null;
  author_id: string | null;
  author_name?: string;
  entry_date: string;
  summary: string;
  issues: string | null;
  materials_used: string | null;
  weather: string | null;
  sqft_completed: number | null;
  photos: string[];      // array of attachment URLs
  created_at: string;
}

export interface CreateJournalInput {
  job_id?: string;
  job_name?: string;
  author_id?: string;
  entry_date?: string;
  summary: string;
  issues?: string;
  materials_used?: string;
  weather?: string;
  sqft_completed?: number;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function createJournalEntry(input: CreateJournalInput): Promise<JournalEntry> {
  if (!supabase) throw new Error("Supabase not configured");

  // Write to daily_logs (existing table - preserves compatibility)
  const { data, error } = await supabase
    .from("daily_logs")
    .insert({
      log_date: input.entry_date ?? new Date().toISOString().slice(0, 10),
      job_name: input.job_name ?? null,
      weather_condition: input.weather ?? null,
      work_summary: input.summary,
      issues: input.issues ?? null,
      materials_used: input.materials_used ?? null,
      sqft_completed: input.sqft_completed ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  // Also post to NAF feed for the activity timeline
  if (supabase) {
    await supabase.from("naf_entries").insert({
      entry_type: "note",
      body: input.summary,
      job_name: input.job_name ?? null,
      user_id: input.author_id ?? null,
      ref_id: data.id,
      ref_table: "daily_logs",
      metadata: {
        weather: input.weather,
        sqft_completed: input.sqft_completed,
        has_issues: Boolean(input.issues),
      },
    });
  }

  return { ...data, photos: [] } as JournalEntry;
}

export async function getJournalEntries(jobName?: string, limit = 50): Promise<JournalEntry[]> {
  if (!supabase) return [];
  let query = supabase
    .from("daily_logs")
    .select("*")
    .order("log_date", { ascending: false })
    .limit(limit);
  if (jobName) query = query.eq("job_name", jobName);
  const { data } = await query;
  return (data ?? []).map((d) => ({ ...d, photos: [] })) as JournalEntry[];
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("daily_logs").select("*").eq("id", id).single();
  if (!data) return null;
  return { ...data, photos: [] } as JournalEntry;
}

// ── Weather options (shared with existing notepad) ───────────────────────────
export const WEATHER_OPTIONS = ["Sunny", "Cloudy", "Rainy", "Windy", "Hot", "Overcast"] as const;
export type WeatherCondition = typeof WEATHER_OPTIONS[number];
