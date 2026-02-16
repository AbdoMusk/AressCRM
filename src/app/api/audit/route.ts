import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requirePermission } from "@/lib/permissions/rbac";
import { createClient } from "@/lib/supabase/server";
import { Actions } from "@/lib/permissions/actions";
import { handleApiError } from "@/lib/utils/api";
import type { AuditCategory } from "@/lib/audit/logger";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    requirePermission(ctx, Actions.AUDIT_VIEW);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
    const category = searchParams.get("category") as AuditCategory | null;
    const entityType = searchParams.get("entity_type");

    const supabase = await createClient();
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (category) query = query.eq("category", category);
    if (entityType) query = query.eq("entity_type", entityType);

    const { data, error, count } = await query;

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data,
      pagination: { page, limit, total: count ?? 0 },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
