/**
 * EMPLOYEES API
 * GET  — list employees with filtering
 * PATCH — update employee profile
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/engines/activity";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyAuth(req: NextRequest): Promise<{ role: string; profileId: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const jwt = authHeader.slice(7);

  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: user } = await userClient.auth.getUser(jwt);
  if (!user.user) return null;

  const { data: profile } = await userClient
    .from("profiles")
    .select("id, role")
    .eq("auth_id", user.user.id)
    .single();

  if (!profile) return null;
  return { role: profile.role, profileId: profile.id };
}

const ALLOWED_ROLES = ["CreativeEditor", "company_owner", "field_manager"];

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || !ALLOWED_ROLES.includes(auth.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = getAdminClient();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const status = searchParams.get("employment_status");
    const type = searchParams.get("employment_type");

    let query = admin
      .from("profiles")
      .select("*")
      .order("full_name");

    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    if (role) query = query.eq("role", role);
    if (status) query = query.eq("employment_status", status);
    if (type) query = query.eq("employment_type", type);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || !["CreativeEditor", "company_owner"].includes(auth.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = getAdminClient();
    const { profileId, updates } = await req.json();
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", profileId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log activity
    logActivity({
      actor_id: auth.profileId,
      action: "employee_updated",
      resource_type: "profile",
      resource_id: profileId,
      new_data: updates,
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
