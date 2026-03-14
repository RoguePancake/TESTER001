/**
 * TIME ENTRY APPROVAL API
 * POST — approve or reject a time entry
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

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || !ALLOWED_ROLES.includes(auth.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { entryId, action } = await req.json();
    if (!entryId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "entryId and action (approve|reject) required" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();
    const { error } = await admin
      .from("time_entries")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        approved_by: auth.profileId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", entryId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log activity
    logActivity({
      actor_id: auth.profileId,
      action: action === "approve" ? "time_entry_approved" : "time_entry_rejected",
      resource_type: "time_entry",
      resource_id: entryId,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
