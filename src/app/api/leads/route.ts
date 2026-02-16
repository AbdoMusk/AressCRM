import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as leadService from "@/modules/leads/services/lead.service";
import { handleApiError } from "@/lib/utils/api";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const leads = await leadService.getLeads(ctx);
    return NextResponse.json({ data: leads });
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
    const lead = await leadService.createLead(ctx, body);
    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
