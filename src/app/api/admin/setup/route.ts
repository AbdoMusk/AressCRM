import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/setup
 *
 * One-time endpoint to assign the initial admin role to a user.
 * Security: Requires SUPABASE_SERVICE_ROLE_KEY as Authorization header.
 *
 * Body:
 * {
 *   "userEmail": "admin@example.com",
 *   "role": "admin" | "manager" | "sales_rep"
 * }
 *
 * Usage:
 * curl -X POST http://localhost:3000/api/admin/setup \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
 *   -d '{"userEmail":"admin@example.com","role":"admin"}'
 */
export async function POST(req: NextRequest) {
  try {
    // Verify Authorization header
    const authHeader = req.headers.get("authorization");
    const providedKey = authHeader?.replace("Bearer ", "");

    if (!providedKey || providedKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing service role key" },
        { status: 401 }
      );
    }

    const { userEmail, role } = await req.json();

    // Validate inputs
    if (!userEmail || !role) {
      return NextResponse.json(
        { error: "Missing required fields: userEmail, role" },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "manager", "sales_rep"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    // 1. Get the user by email from auth.users via admin API
    const { data: { users }, error: authError } = await admin.auth.admin.listUsers();

    if (authError || !users) {
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    const authUser = users.find((u) => u.email === userEmail);

    if (!authUser) {
      return NextResponse.json(
        { error: `User not found with email: ${userEmail}` },
        { status: 404 }
      );
    }

    const userId = authUser.id;

    // 2. Check if user already has a role
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("role_id")
      .eq("user_id", userId)
      .single();

    if (existingRole) {
      return NextResponse.json(
        { error: "User already has a role assigned" },
        { status: 409 }
      );
    }

    // 3. Get the role ID by name
    const { data: roleData, error: roleError } = await admin
      .from("roles")
      .select("id")
      .eq("name", role)
      .single();

    if (roleError || !roleData) {
      return NextResponse.json(
        { error: `Role "${role}" not found in database` },
        { status: 404 }
      );
    }

    // 4. Assign the role
    const { error: assignError } = await admin.from("user_roles").insert({
      user_id: userId,
      role_id: roleData.id,
    });

    if (assignError) {
      return NextResponse.json(
        { error: `Failed to assign role: ${assignError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `User ${userEmail} has been assigned the ${role} role`,
        userId,
        role,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
