import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requirePermission } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/utils/api";

/**
 * GET /api/objects/export?type=deal&format=csv
 *
 * Exports objects data in CSV, JSON, or plain text format.
 * Query params:
 *   - type: object type name to filter (optional)
 *   - format: csv | json | text (default: csv)
 *   - limit: max rows (default: 500)
 */
export async function GET(req: NextRequest) {
  try {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check read permission before allowing export
  requirePermission(ctx, Actions.OBJECT_READ);

  const { searchParams } = req.nextUrl;
  const objectType = searchParams.get("type") || undefined;
  const format = searchParams.get("format") || "csv";
  const limit = Math.min(Number(searchParams.get("limit") || 500), 5000);

  const admin = createAdminClient();

  // Get objects
  let query = admin
    .from("objects")
    .select("id, object_type_id, created_at, updated_at, object_types(name, display_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (objectType) {
    const { data: typeRow } = await admin
      .from("object_types")
      .select("id")
      .eq("name", objectType)
      .single();
    if (typeRow) {
      query = query.eq("object_type_id", typeRow.id);
    }
  }

  const { data: objects, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!objects || objects.length === 0) {
    return new NextResponse("No data found", { status: 404 });
  }

  // Load all module data
  const objectIds = objects.map((o: any) => o.id);
  const { data: allMods } = await admin
    .from("object_modules")
    .select("object_id, data, modules(name)")
    .in("object_id", objectIds);

  // Build rows
  const rows = objects.map((o: any) => {
    const objMods = (allMods ?? []).filter((m: any) => m.object_id === o.id);
    const row: Record<string, string> = {
      id: o.id,
      type: (o as any).object_types?.display_name ?? "Unknown",
      created_at: o.created_at,
    };

    for (const mod of objMods) {
      const modName = (mod as any).modules?.name ?? "unknown";
      if (mod.data && typeof mod.data === "object") {
        for (const [key, value] of Object.entries(mod.data as Record<string, unknown>)) {
          row[`${modName}_${key}`] = String(value ?? "");
        }
      }
    }

    return row;
  });

  // Derive all columns
  const colSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) colSet.add(key);
  }
  const columns = Array.from(colSet);

  const filename = `export-${objectType ?? "all"}-${new Date().toISOString().slice(0, 10)}`;

  if (format === "json") {
    return NextResponse.json(rows, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  }

  if (format === "text") {
    const text = rows
      .map((r) => columns.map((c) => `${c}: ${r[c] ?? ""}`).join(" | "))
      .join("\n\n");
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.txt"`,
      },
    });
  }

  // Default: CSV
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv =
    columns.map(escape).join(",") +
    "\n" +
    rows.map((r) => columns.map((c) => escape(r[c] ?? "")).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
  } catch (err) {
    return handleApiError(err);
  }
}
