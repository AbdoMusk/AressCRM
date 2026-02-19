import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import { handleApiError } from "@/lib/utils/api";
import * as moduleService from "@/modules/engine/services/module.service";

/**
 * GET /api/modules — List all module definitions
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const modules = await moduleService.getModules(ctx);
    return NextResponse.json({ data: modules });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/modules — Create a new module definition
 */
export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const module = await moduleService.createModule(ctx, body);
    return NextResponse.json({ data: module }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
