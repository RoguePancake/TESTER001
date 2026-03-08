/**
 * JOB ENGINE
 * Manages jobsites and projects.
 * Handles creation, assignment, status tracking, and crew attachment.
 */

import { supabase } from "@/lib/supabase";

export type JobStatus = "active" | "completed" | "on_hold" | "cancelled";

export interface Job {
  id: string;
  company_id: string | null;
  name: string;
  address: string | null;
  client_name: string | null;
  status: JobStatus;
  assigned_crew_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateJobInput {
  company_id?: string;
  name: string;
  address?: string;
  client_name?: string;
  status?: JobStatus;
  notes?: string;
  created_by?: string;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function createJob(input: CreateJobInput): Promise<Job> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("job_sites")
    .insert({ ...input, status: input.status ?? "active" })
    .select()
    .single();
  if (error) throw error;
  return data as Job;
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<Job> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("job_sites")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Job;
}

export async function getJobs(companyId?: string, status?: JobStatus): Promise<Job[]> {
  if (!supabase) return [];
  let query = supabase.from("job_sites").select("*").order("created_at", { ascending: false });
  if (companyId) query = query.eq("company_id", companyId);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return (data ?? []) as Job[];
}

export async function getJob(id: string): Promise<Job | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("job_sites").select("*").eq("id", id).single();
  return data as Job | null;
}

export async function assignCrewToJob(jobId: string, crewId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("job_sites")
    .update({ assigned_crew_id: crewId, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

export async function updateJobStatus(jobId: string, status: JobStatus): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("job_sites")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  active: "Active",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  active: "text-green-700 bg-green-100",
  completed: "text-blue-700 bg-blue-100",
  on_hold: "text-yellow-700 bg-yellow-100",
  cancelled: "text-red-700 bg-red-100",
};
