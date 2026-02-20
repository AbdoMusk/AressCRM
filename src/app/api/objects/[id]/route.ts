import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import { handleApiError } from "@/lib/utils/api";
import * as objectService from "@/modules/engine/services/object.service";

/**
 * GET /api/objects/[id] — Get single object
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const object = await objectService.getObject(ctx, id);
    return NextResponse.json({ data: object });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/objects/[id] — Delete object
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await objectService.deleteObject(ctx, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PATCH /api/objects/[id] — Update object module data
 * Body: { moduleId: string, data: Record<string, unknown> }
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

    if (!body.moduleId || !body.data) {
      return NextResponse.json(
        { error: "Missing moduleId or data in request body" },
        { status: 422 }
      );
    }

    const updated = await objectService.updateObjectModule(ctx, id, body.moduleId, body.data);
    return NextResponse.json({ data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
