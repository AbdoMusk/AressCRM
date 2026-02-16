import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as leadService from "@/modules/leads/services/lead.service";
import { handleApiError } from "@/lib/utils/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const lead = await leadService.getLead(ctx, id);
    return NextResponse.json({ data: lead });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const lead = await leadService.updateLead(ctx, id, body);
    return NextResponse.json({ data: lead });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await leadService.deleteLead(ctx, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
