import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as statusService from "@/modules/settings/services/status.service";
import { handleApiError } from "@/lib/utils/api";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const statuses = await statusService.getStatuses(ctx);
    return NextResponse.json({ data: statuses });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const status = await statusService.createStatus(ctx, body);
    return NextResponse.json({ data: status }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
