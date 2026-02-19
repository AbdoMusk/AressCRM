import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import { handleApiError } from "@/lib/utils/api";
import * as objectTypeService from "@/modules/engine/services/object-type.service";

/**
 * GET /api/object-types — List all object types
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const types = await objectTypeService.getObjectTypes(ctx);
    return NextResponse.json({ data: types });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/object-types — Create a new object type
 */
export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const type = await objectTypeService.createObjectType(ctx, body);
    return NextResponse.json({ data: type }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
