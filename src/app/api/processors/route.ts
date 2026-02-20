import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import { handleApiError } from "@/lib/utils/api";
import { getObject } from "@/modules/engine/services/object.service";
import { initProcessors, runProcessors, getEligibleProcessors } from "@/modules/engine/processors";

// Initialize processors on first request
initProcessors();

/**
 * GET /api/processors?objectId=xxx
 * Run all eligible processors on a specific object and return results.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const objectId = searchParams.get("objectId");

    if (!objectId) {
      return NextResponse.json(
        { error: "objectId is required" },
        { status: 400 }
      );
    }

    const object = await getObject(ctx, objectId);
    if (!object) {
      return NextResponse.json(
        { error: "Object not found" },
        { status: 404 }
      );
    }

    const results = await runProcessors(ctx, object);
    const eligible = getEligibleProcessors(object).map((p) => ({
      name: p.spec.name,
      description: p.spec.description,
      requiredModules: p.spec.requiredModules,
      optionalModules: p.spec.optionalModules,
    }));

    return NextResponse.json({ results, eligible });
  } catch (err) {
    return handleApiError(err);
  }
}
