/**
 * ADMIN USERS API — Server-side only
 * Uses SUPABASE_SERVICE_ROLE_KEY (never exposed to client).
 * Only callable by authenticated CreativeEditor users.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Verify the caller is an authenticated CreativeEditor */
async function verifyCreativeEditor(req: NextRequest): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const jwt = authHeader.slice(7);

  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: user } = await userClient.auth.getUser(jwt);
  if (!user.user) return false;

  const { data: profile } = await userClient
    .from("profiles")
    .select("role")
    .eq("auth_id", user.user.id)
    .single();

  return profile?.role === "CreativeEditor";
}

// POST /api/admin/users — create a new in-house user account
export async function POST(req: NextRequest) {
  try {
    if (!(await verifyCreativeEditor(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = getAdminClient();
    const body = await req.json();
    const { email, password, fullName, role, companyId } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "email, password, and fullName are required" },
        { status: 400 },
      );
    }

    // Create Supabase auth user (email_confirm: true = skip confirmation email)
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        user_metadata: { full_name: fullName },
        email_confirm: true,
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Insert the app profile row
    const { error: profileError } = await admin.from("profiles").insert({
      auth_id: authData.user.id,
      company_id: companyId || null,
      full_name: fullName,
      email,
      role: role || "employee",
      is_active: true,
    });

    if (profileError) {
      // Roll back the auth user so we don't have orphans
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, userId: authData.user.id });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/users — update role, active status, or display name
export async function PATCH(req: NextRequest) {
  try {
    if (!(await verifyCreativeEditor(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = getAdminClient();
    const body = await req.json();
    const { profileId, updates } = body as {
      profileId: string;
      updates: { role?: string; is_active?: boolean; full_name?: string };
    };

    if (!profileId) {
      return NextResponse.json(
        { error: "profileId is required" },
        { status: 400 },
      );
    }

    const { error } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", profileId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/users — deactivate (not permanently delete) a user
export async function DELETE(req: NextRequest) {
  try {
    if (!(await verifyCreativeEditor(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = getAdminClient();
    const { profileId } = await req.json();

    if (!profileId) {
      return NextResponse.json(
        { error: "profileId is required" },
        { status: 400 },
      );
    }

    const { error } = await admin
      .from("profiles")
      .update({ is_active: false })
      .eq("id", profileId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
