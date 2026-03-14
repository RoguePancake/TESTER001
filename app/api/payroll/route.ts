/**
 * PAYROLL API
 * POST — generate or finalize payroll
 * GET  — retrieve payroll summaries for a period
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

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || !["CreativeEditor", "company_owner"].includes(auth.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "finalize") {
      const admin = getAdminClient();
      const { summaryIds } = body;
      if (!summaryIds?.length) {
        return NextResponse.json({ error: "summaryIds required" }, { status: 400 });
      }
      const { error } = await admin
        .from("payroll_summaries")
        .update({
          status: "finalized",
          finalized_by: auth.profileId,
          finalized_at: new Date().toISOString(),
        })
        .in("id", summaryIds);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Log activity
      logActivity({
        actor_id: auth.profileId,
        action: "payroll_finalized",
        resource_type: "payroll",
        metadata: { summary_count: summaryIds.length },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || !["CreativeEditor", "company_owner"].includes(auth.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = getAdminClient();
    const { searchParams } = new URL(req.url);
    const periodStart = searchParams.get("period_start");
    const periodEnd = searchParams.get("period_end");

    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: "period_start and period_end required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("payroll_summaries")
      .select("*, profiles(full_name, email, employment_type)")
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
