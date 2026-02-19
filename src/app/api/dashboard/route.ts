import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import { handleApiError } from "@/lib/utils/api";
import * as queryService from "@/modules/engine/services/query.service";

/**
 * GET /api/dashboard — Dashboard stats with optional aggregation params
 *
 * Query params:
 *   ?aggregate=component.field.sum    (returns numeric aggregation)
 *   ?countBy=component.field          (returns distribution)
 *   (no params)                       (returns full dashboard stats)
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);

    // Aggregation mode
    const aggregate = searchParams.get("aggregate");
    if (aggregate) {
      const parts = aggregate.split(".");
      if (parts.length < 2 || parts.length > 3) {
        return NextResponse.json(
          { error: "aggregate format: module.field[.aggType]" },
          { status: 400 }
        );
      }
      const [moduleName, fieldKey, aggType] = parts;
      const result = await queryService.aggregateField(
        ctx,
        moduleName,
        fieldKey,
        (aggType as "sum" | "avg" | "count" | "min" | "max") ?? "sum"
      );
      return NextResponse.json({ data: result });
    }

    // Count-by mode
    const countBy = searchParams.get("countBy");
    if (countBy) {
      const parts = countBy.split(".");
      if (parts.length !== 2) {
        return NextResponse.json(
          { error: "countBy format: module.field" },
          { status: 400 }
        );
      }
      const [moduleName, fieldKey] = parts;
      const result = await queryService.countByField(ctx, moduleName, fieldKey);
      return NextResponse.json({ data: result });
    }

    // Default: full dashboard stats
    const stats = await queryService.getDashboardStats(ctx);
    return NextResponse.json({ data: stats });
  } catch (err) {
    return handleApiError(err);
  }
}
