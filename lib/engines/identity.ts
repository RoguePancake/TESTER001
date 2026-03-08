/**
 * IDENTITY ENGINE
 * Manages companies, users, authentication, and session state.
 * Wraps Supabase Auth with app-level identity concepts.
 */

import { supabase } from "@/lib/supabase";
import type { UserRole } from "./permissions";
import { normalizeRole } from "./permissions";

export interface Company {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  max_employees: number;
  is_active: boolean;
  created_at: string;
}

export interface AppUser {
  id: string;
  auth_id: string | null;      // Supabase auth.users UUID
  company_id: string | null;
  full_name: string;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  company?: Company;
}

// ── Session helpers ──────────────────────────────────────────────────────────

/** Get the currently authenticated Supabase user */
export async function getCurrentAuthUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/** Get the full app profile for the current auth user */
export async function getCurrentAppUser(): Promise<AppUser | null> {
  if (!supabase) return null;
  const authUser = await getCurrentAuthUser();
  if (!authUser) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*, companies(*)")
    .eq("auth_id", authUser.id)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    role: normalizeRole(data.role),
  } as AppUser;
}

// ── Auth operations ──────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function signUp(email: string, password: string, fullName: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

// ── Company helpers ──────────────────────────────────────────────────────────

export async function getCompany(companyId: string): Promise<Company | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();
  return data ?? null;
}

export async function getCompanyEmployees(companyId: string): Promise<AppUser[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("full_name");
  return (data ?? []).map((p) => ({ ...p, role: normalizeRole(p.role) })) as AppUser[];
}

/** Check if a company is under the 50-employee limit */
export async function canAddEmployee(companyId: string): Promise<boolean> {
  if (!supabase) return true;
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("is_active", true);
  return (count ?? 0) < 50;
}

// ── The CreativeEditor special account ──────────────────────────────────────
// CreativeEditor is the platform-level developer/root account.
// It is identified by the special role value in the profiles table.
export const CREATIVE_EDITOR_ROLE = "CreativeEditor";
