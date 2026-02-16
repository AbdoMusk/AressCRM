import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * CHANGE: Emergency admin setup endpoint
 * 
 * Purpose: Fix issue where new users without assigned roles see "Access Denied"
 * by providing a simple endpoint to assign roles after user creation.
 * 
 * ⚠️  WARNING: This endpoint is for initial setup only.
 * In production, require authentication or disable after first admin is created.
 * See CHANGES.md for migration notes.
 * 
 * Usage:
 * POST /api/admin/setup
 * Body: { userEmail: "user@example.com", role: "admin" | "manager" | "sales_rep" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, role = "admin" } = body;

    if (!userEmail || !role) {
      return NextResponse.json(
        { error: "Missing userEmail or role" },
        { status: 400 }
      );
    }

    if (![
      "admin",
      "manager",
      "sales_rep",
    ].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be "admin", "manager", or "sales_rep"' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Find user by email
    const { data: users, error: userError } = await admin.auth.admin.listUsers();
    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    const user = users?.users?.find(
      (u) => u.email?.toLowerCase() === userEmail.toLowerCase()
    );
    if (!user) {
      return NextResponse.json(
        { error: `User with email '${userEmail}' not found` },
        { status: 404 }
      );
    }

    // Get role ID
    const { data: roles, error: roleError } = await admin
      .from("roles")
      .select("id")
      .eq("name", role)
      .single();

    if (roleError || !roles) {
      return NextResponse.json(
        { error: `Role '${role}' not found in database` },
        { status: 404 }
      );
    }

    // Assign role to user
    const { error: assignError } = await admin
      .from("user_roles")
      .insert({ user_id: user.id, role_id: roles.id })
      .select()
      .single();

    if (assignError) {
      // Check if already assigned
      if (assignError.code === "23505") {
        return NextResponse.json(
          { message: `User already has role '${role}'` },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: assignError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: `User ${userEmail} assigned role '${role}'`,
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Setup error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
