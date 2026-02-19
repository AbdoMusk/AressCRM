import { NextResponse } from "next/server";
import { getAuthContext, requirePermission } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/utils/api";

/**
 * GET /api/audit — List audit logs (admin only)
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    requirePermission(ctx, Actions.AUDIT_VIEW);

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("audit_logs")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
