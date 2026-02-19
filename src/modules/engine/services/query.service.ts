/**
 * OMP Engine — Query/Aggregation Service
 *
 * Provides analytics and aggregation over object module data.
 * Powers the dashboard.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/permissions/rbac";
import { requirePermission } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { AppError } from "@/lib/utils/errors";

export interface ObjectCountByType {
  objectTypeId: string;
  typeName: string;
  displayName: string;
  icon: string;
  color: string;
  count: number;
}

export interface FieldDistribution {
  value: string;
  count: number;
}

export interface DashboardStats {
  objectCounts: ObjectCountByType[];
  totalObjects: number;
  recentObjects: {
    id: string;
    objectType: string;
    displayName: string;
    createdAt: string;
  }[];
}

/**
 * Get dashboard overview stats.
 */
export async function getDashboardStats(
  ctx: AuthContext
): Promise<DashboardStats> {
  requirePermission(ctx, Actions.DASHBOARD_VIEW);

  const admin = createAdminClient();

  // Count by type using DB function
  const { data: counts, error: countError } = await admin.rpc(
    "count_objects_by_type"
  );

  if (countError) throw new AppError("DB_ERROR", countError.message);

  const objectCounts: ObjectCountByType[] = (counts ?? []).map((c: any) => ({
    objectTypeId: c.object_type_id,
    typeName: c.type_name,
    displayName: c.display_name,
    icon: c.icon ?? "Box",
    color: c.color ?? "#6B7280",
    count: Number(c.count),
  }));

  const totalObjects = objectCounts.reduce((sum, c) => sum + c.count, 0);

  // Get recent objects with display names
  const { data: recentRaw } = await admin
    .from("objects")
    .select("id, object_type_id, created_at, object_types(name)")
    .order("created_at", { ascending: false })
    .limit(10);

  // Load identity/org modules for display names
  const recentIds = (recentRaw ?? []).map((e) => e.id);
  const { data: recentMods } = await admin
    .from("object_modules")
    .select("object_id, data, modules(name)")
    .in("object_id", recentIds);

  const recentObjects = (recentRaw ?? []).map((e) => {
    const mods = (recentMods ?? []).filter((m) => m.object_id === e.id);
    const identity = mods.find((m) => (m as any).modules?.name === "identity");
    const org = mods.find((m) => (m as any).modules?.name === "organization");

    let displayName = "Unnamed Object";
    if (identity?.data && (identity.data as any).name) {
      displayName = String((identity.data as any).name);
    } else if (org?.data && (org.data as any).company_name) {
      displayName = String((org.data as any).company_name);
    }

    return {
      id: e.id,
      objectType: (e as any).object_types?.name ?? "unknown",
      displayName,
      createdAt: e.created_at,
    };
  });

  return { objectCounts, totalObjects, recentObjects };
}

/**
 * Aggregate a numeric field across objects.
 */
export async function aggregateField(
  ctx: AuthContext,
  moduleName: string,
  fieldKey: string,
  aggType: "sum" | "avg" | "count" | "min" | "max" = "sum"
): Promise<number> {
  requirePermission(ctx, Actions.DASHBOARD_VIEW);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("aggregate_module_field", {
    p_module_name: moduleName,
    p_field_key: fieldKey,
    p_agg_type: aggType,
  });

  if (error) throw new AppError("DB_ERROR", error.message);
  return Number(data ?? 0);
}

/**
 * Count objects grouped by a module field value.
 */
export async function countByField(
  ctx: AuthContext,
  moduleName: string,
  fieldKey: string
): Promise<FieldDistribution[]> {
  requirePermission(ctx, Actions.DASHBOARD_VIEW);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("count_by_module_field", {
    p_module_name: moduleName,
    p_field_key: fieldKey,
  });

  if (error) throw new AppError("DB_ERROR", error.message);

  return (data ?? []).map((d: any) => ({
    value: d.field_value,
    count: Number(d.count),
  }));
}
