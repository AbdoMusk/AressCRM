import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import { handleApiError } from "@/lib/utils/api";
import * as moduleService from "@/modules/engine/services/module.service";

/**
 * GET /api/modules/[id]
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const module = await moduleService.getModule(ctx, id);
    return NextResponse.json({ data: module });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PATCH /api/modules/[id]
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const module = await moduleService.updateModule(ctx, id, body);
    return NextResponse.json({ data: module });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/modules/[id]
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await moduleService.deleteModule(ctx, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
