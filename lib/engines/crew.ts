/**
 * CREW ENGINE
 * Organize employees into crews.
 * Managers can create crews, assign workers, and assign crews to jobs.
 */

import { supabase } from "@/lib/supabase";

export interface Crew {
  id: string;
  company_id: string | null;
  name: string;
  foreman_id: string | null;
  foreman_name?: string;
  member_count?: number;
  is_active: boolean;
  created_at: string;
}

export interface CrewMember {
  id: string;
  crew_id: string;
  user_id: string;
  full_name?: string;
  role?: string;
  joined_at: string;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function createCrew(name: string, companyId?: string, foremanId?: string): Promise<Crew> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("crews")
    .insert({ name, company_id: companyId ?? null, foreman_id: foremanId ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Crew;
}

export async function getCrews(companyId?: string): Promise<Crew[]> {
  if (!supabase) return [];
  let query = supabase.from("crews").select("*, crew_members(count)").eq("is_active", true);
  if (companyId) query = query.eq("company_id", companyId);
  const { data } = await query;
  return (data ?? []) as Crew[];
}

export async function addCrewMember(crewId: string, userId: string): Promise<CrewMember> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("crew_members")
    .insert({ crew_id: crewId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as CrewMember;
}

export async function removeCrewMember(crewId: string, userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("crew_members").delete().eq("crew_id", crewId).eq("user_id", userId);
}

export async function getCrewMembers(crewId: string): Promise<CrewMember[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("crew_members")
    .select("*, profiles(full_name, role)")
    .eq("crew_id", crewId);
  return (data ?? []) as CrewMember[];
}
