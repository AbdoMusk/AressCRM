import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getDashboardStats } from "@/modules/dashboard/services/dashboard.service";
import { handleApiError } from "@/lib/utils/api";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stats = await getDashboardStats(ctx);
    return NextResponse.json({ data: stats });
  } catch (err) {
    return handleApiError(err);
  }
}
