import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import { handleApiError } from "@/lib/utils/api";
import * as objectTypeService from "@/modules/engine/services/object-type.service";

/**
 * GET /api/object-types/[id] — Get a single object type with modules
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const type = await objectTypeService.getObjectType(ctx, id);
    return NextResponse.json({ data: type });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PATCH /api/object-types/[id] — Update an object type
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
    const type = await objectTypeService.updateObjectType(ctx, id, body);
    return NextResponse.json({ data: type });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/object-types/[id] — Delete an object type
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await objectTypeService.deleteObjectType(ctx, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
