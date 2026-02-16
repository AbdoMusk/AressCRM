import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as sourceService from "@/modules/settings/services/source.service";
import { handleApiError } from "@/lib/utils/api";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sources = await sourceService.getSources(ctx);
    return NextResponse.json({ data: sources });
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
    const source = await sourceService.createSource(ctx, body);
    return NextResponse.json({ data: source }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
