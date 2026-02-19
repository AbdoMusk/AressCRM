import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import { handleApiError } from "@/lib/utils/api";
import * as objectService from "@/modules/engine/services/object.service";
import type { ObjectQueryParams, ObjectFilter } from "@/modules/engine/types/object.types";

/**
 * GET /api/objects — List objects with filtering
 * Query params: type, page, limit, search, filter[module][field][op]=value
 */
export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const params: ObjectQueryParams = {
      objectType: url.searchParams.get("type") ?? undefined,
      page: Number(url.searchParams.get("page") ?? "1"),
      limit: Number(url.searchParams.get("limit") ?? "50"),
    };

    // Parse filters: filter[module][field][op]=value
    const filters: ObjectFilter[] = [];
    for (const [key, value] of url.searchParams.entries()) {
      const match = key.match(/^filter\[(\w+)\]\[(\w+)\]\[(\w+)\]$/);
      if (match) {
        filters.push({
          moduleName: match[1],
          fieldKey: match[2],
          operator: match[3] as ObjectFilter["operator"],
          value: value,
        });
      }
    }
    if (filters.length > 0) params.filters = filters;

    const result = await objectService.getObjects(ctx, params);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/objects — Create a new object
 */
export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const object = await objectService.createObject(ctx, body);
    return NextResponse.json({ data: object }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
