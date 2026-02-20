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

// ── Enhanced Dashboard Data ──────────────────

export interface PipelineItem {
  status: string;
  count: number;
  color: string;
}

export interface MonetarySummary {
  totalValue: number;
  avgValue: number;
  totalWeighted: number;
  dealCount: number;
  currency: string;
}

export interface ConversionData {
  wonCount: number;
  lostCount: number;
  totalClosed: number;
  rate: number;
}

export interface MonthlyData {
  month: string;
  count: number;
}

export interface EnhancedDashboardData {
  stats: DashboardStats;
  pipeline: PipelineItem[];
  monetary: MonetarySummary | null;
  conversion: ConversionData | null;
  monthly: MonthlyData[];
}

/**
 * Get all dashboard data in one call — stats, pipeline, monetary, conversion, monthly.
 */
export async function getEnhancedDashboardData(
  ctx: AuthContext
): Promise<EnhancedDashboardData> {
  requirePermission(ctx, Actions.DASHBOARD_VIEW);

  const admin = createAdminClient();

  // Helper: Supabase rpc() returns a PostgrestFilterBuilder, not a native Promise.
  // Wrapping with Promise.resolve() allows .catch() to work.
  async function safeRpc(name: string, params?: Record<string, unknown>) {
    try {
      return await (admin as any).rpc(name, params);
    } catch {
      return { data: null, error: null };
    }
  }

  // Run all queries in parallel
  const [stats, pipelineResult, monetaryResult, conversionResult, monthlyResult] =
    await Promise.all([
      getDashboardStats(ctx),
      safeRpc("pipeline_distribution"),
      safeRpc("monetary_summary"),
      safeRpc("conversion_rate"),
      safeRpc("monthly_object_evolution", { p_months: 6 }),
    ]);

  // Parse pipeline
  const pipeline: PipelineItem[] = ((pipelineResult as any)?.data ?? []).map((p: any) => ({
    status: p.status ?? "unknown",
    count: Number(p.count ?? 0),
    color: p.color ?? "#6B7280",
  }));

  // Parse monetary
  const monetaryRaw = (monetaryResult as any)?.data;
  let monetary: MonetarySummary | null = null;
  if (monetaryRaw && Array.isArray(monetaryRaw) && monetaryRaw.length > 0) {
    const m = monetaryRaw[0];
    monetary = {
      totalValue: Number(m.total_value ?? 0),
      avgValue: Math.round(Number(m.avg_value ?? 0)),
      totalWeighted: Math.round(Number(m.total_weighted ?? 0)),
      dealCount: Number(m.deal_count ?? 0),
      currency: m.currency ?? "USD",
    };
  } else if (monetaryRaw && !Array.isArray(monetaryRaw)) {
    monetary = {
      totalValue: Number(monetaryRaw.total_value ?? 0),
      avgValue: Math.round(Number(monetaryRaw.avg_value ?? 0)),
      totalWeighted: Math.round(Number(monetaryRaw.total_weighted ?? 0)),
      dealCount: Number(monetaryRaw.deal_count ?? 0),
      currency: monetaryRaw.currency ?? "USD",
    };
  }

  // Parse conversion
  const conversionRaw = (conversionResult as any)?.data;
  let conversion: ConversionData | null = null;
  if (conversionRaw && Array.isArray(conversionRaw) && conversionRaw.length > 0) {
    const c = conversionRaw[0];
    conversion = {
      wonCount: Number(c.won_count ?? 0),
      lostCount: Number(c.lost_count ?? 0),
      totalClosed: Number(c.total_closed ?? 0),
      rate: Number(c.rate ?? 0),
    };
  } else if (conversionRaw && !Array.isArray(conversionRaw)) {
    conversion = {
      wonCount: Number(conversionRaw.won_count ?? 0),
      lostCount: Number(conversionRaw.lost_count ?? 0),
      totalClosed: Number(conversionRaw.total_closed ?? 0),
      rate: Number(conversionRaw.rate ?? 0),
    };
  }

  // Parse monthly
  const monthly: MonthlyData[] = ((monthlyResult as any)?.data ?? []).map((m: any) => ({
    month: m.month ?? "",
    count: Number(m.count ?? 0),
  }));

  return { stats, pipeline, monetary, conversion, monthly };
}

/**
 * Get pipeline objects for kanban view.
 */
export async function getPipelineObjects(
  ctx: AuthContext,
  objectType?: string
): Promise<{
  objects: {
    id: string;
    displayName: string;
    objectType: string;
    status: string;
    stageModuleId: string;
    monetaryValue?: number;
    monetaryCurrency?: string;
    assignedTo?: string;
    createdAt: string;
    priority?: string;
  }[];
  statusOptions: { value: string; label: string; color?: string }[];
}> {
  requirePermission(ctx, Actions.DASHBOARD_VIEW);

  const admin = createAdminClient();

  // Get stage module for status options
  const { data: stageMod } = await admin
    .from("modules")
    .select("id, schema")
    .eq("name", "stage")
    .single();

  if (!stageMod) return { objects: [], statusOptions: [] };

  const stageSchema = (stageMod.schema as any);
  const statusField = stageSchema?.fields?.find((f: any) => f.key === "status");
  const statusOptions = (statusField?.options ?? []) as { value: string; label: string; color?: string }[];

  // Get all objects that have a stage module
  let query = admin
    .from("object_modules")
    .select("object_id, data, module_id")
    .eq("module_id", stageMod.id);

  const { data: stageModules } = await query;
  if (!stageModules || stageModules.length === 0) return { objects: [], statusOptions };

  const objectIds = stageModules.map((s: any) => s.object_id);

  // Filter by object type if specified
  let objectQuery = admin
    .from("objects")
    .select("id, object_type_id, created_at, object_types(name, display_name)")
    .in("id", objectIds);

  if (objectType) {
    const { data: typeRow } = await admin
      .from("object_types")
      .select("id")
      .eq("name", objectType)
      .single();
    if (typeRow) {
      objectQuery = objectQuery.eq("object_type_id", typeRow.id);
    }
  }

  const { data: objects } = await objectQuery;
  if (!objects || objects.length === 0) return { objects: [], statusOptions };

  const filteredObjectIds = objects.map((o: any) => o.id);

  // Load all modules for these objects (identity, monetary, assignment)
  const { data: allObjModules } = await admin
    .from("object_modules")
    .select("object_id, module_id, data, modules(name)")
    .in("object_id", filteredObjectIds);

  const result = objects.map((obj: any) => {
    const objMods = (allObjModules ?? []).filter((m: any) => m.object_id === obj.id);

    const stage = objMods.find((m: any) => (m as any).modules?.name === "stage");
    const identity = objMods.find((m: any) => (m as any).modules?.name === "identity");
    const monetary = objMods.find((m: any) => (m as any).modules?.name === "monetary");
    const assignment = objMods.find((m: any) => (m as any).modules?.name === "assignment");

    let displayName = "Unnamed";
    if (identity?.data && (identity.data as any).name) {
      displayName = String((identity.data as any).name);
    }

    return {
      id: obj.id,
      displayName,
      objectType: (obj as any).object_types?.display_name ?? "Unknown",
      status: String((stage?.data as any)?.status ?? "new"),
      stageModuleId: stageMod.id,
      monetaryValue: monetary ? Number((monetary.data as any)?.amount ?? 0) : undefined,
      monetaryCurrency: monetary ? String((monetary.data as any)?.currency ?? "USD") : undefined,
      assignedTo: assignment ? String((assignment.data as any)?.assigned_to ?? "") : undefined,
      createdAt: obj.created_at,
      priority: assignment ? String((assignment.data as any)?.priority ?? "medium") : undefined,
    };
  });

  return { objects: result, statusOptions };
}

// ── Widget Data Fetching ─────────────────────

import type { PageWidget, WidgetConfig } from "./page.service";

/**
 * Fetch data for all widgets on a page.
 * Returns a map of widgetId → data for each widget.
 */
export async function fetchWidgetData(
  ctx: AuthContext,
  widgets: PageWidget[]
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  await Promise.all(
    widgets.map(async (widget) => {
      try {
        results[widget.id] = await fetchSingleWidgetData(ctx, widget);
      } catch {
        results[widget.id] = null;
      }
    })
  );

  return results;
}

async function fetchSingleWidgetData(
  ctx: AuthContext,
  widget: PageWidget
): Promise<any> {
  const admin = createAdminClient();
  const config = widget.config;

  switch (widget.widgetType) {
    case "stat_card":
      return fetchStatCardData(ctx, admin, config);

    case "chart":
      return fetchChartData(ctx, admin, config);

    case "object_list":
      return fetchObjectListData(admin, config);

    case "pipeline":
      return fetchPipelineWidgetData(ctx, admin, config);

    case "timeline":
      return fetchTimelineData(admin, config);

    case "table_view":
      return fetchTableViewData(admin, config);

    case "processor_report":
      return { message: "Processor report widget" };

    default:
      return null;
  }
}

async function fetchStatCardData(
  ctx: AuthContext,
  admin: any,
  config: WidgetConfig
): Promise<any> {
  const { moduleName, fieldKey, aggType, objectType } = config;

  if (moduleName && fieldKey && aggType && aggType !== "count") {
    const value = await aggregateField(ctx, moduleName, fieldKey, aggType);
    return { value, subtitle: `${aggType} of ${fieldKey}` };
  }

  // Count objects by type
  if (objectType) {
    const { data: typeRow } = await admin
      .from("object_types")
      .select("id, display_name")
      .eq("name", objectType)
      .single();

    if (typeRow) {
      const { count } = await admin
        .from("objects")
        .select("id", { count: "exact", head: true })
        .eq("object_type_id", typeRow.id);
      return { value: count ?? 0, subtitle: typeRow.display_name };
    }
  }

  // Fallback: total objects
  const { count } = await admin
    .from("objects")
    .select("id", { count: "exact", head: true });
  return { value: count ?? 0, subtitle: "Total objects" };
}

async function fetchChartData(
  ctx: AuthContext,
  admin: any,
  config: WidgetConfig
): Promise<any> {
  const { groupByModule, groupByField, moduleName, fieldKey, objectType } = config;

  const modName = groupByModule ?? moduleName;
  const fKey = groupByField ?? fieldKey;

  if (modName && fKey) {
    const distribution = await countByField(ctx, modName, fKey);
    return { items: distribution };
  }

  // Fallback: count by object type
  const { data: counts } = await admin.rpc("count_objects_by_type");
  return {
    items: (counts ?? []).map((c: any) => ({
      value: c.display_name ?? c.type_name,
      count: Number(c.count),
      color: c.color,
    })),
  };
}

async function fetchObjectListData(
  admin: any,
  config: WidgetConfig
): Promise<any> {
  const limit = config.limit ?? 10;

  let query = admin
    .from("objects")
    .select("id, object_type_id, created_at, object_types(name, display_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (config.objectType) {
    const { data: typeRow } = await admin
      .from("object_types")
      .select("id")
      .eq("name", config.objectType)
      .single();
    if (typeRow) {
      query = query.eq("object_type_id", typeRow.id);
    }
  }

  const { data: objects } = await query;
  if (!objects || objects.length === 0) return { objects: [] };

  // Load display names
  const objectIds = objects.map((o: any) => o.id);
  const { data: mods } = await admin
    .from("object_modules")
    .select("object_id, data, modules(name)")
    .in("object_id", objectIds);

  const result = objects.map((o: any) => {
    const objMods = (mods ?? []).filter((m: any) => m.object_id === o.id);
    const identity = objMods.find((m: any) => (m as any).modules?.name === "identity");
    const org = objMods.find((m: any) => (m as any).modules?.name === "organization");

    let displayName = "Unnamed";
    if (identity?.data && (identity.data as any).name) {
      displayName = String((identity.data as any).name);
    } else if (org?.data && (org.data as any).company_name) {
      displayName = String((org.data as any).company_name);
    }

    return {
      id: o.id,
      displayName,
      objectType: (o as any).object_types?.display_name ?? "Unknown",
    };
  });

  return { objects: result };
}

async function fetchPipelineWidgetData(
  ctx: AuthContext,
  admin: any,
  config: WidgetConfig
): Promise<any> {
  try {
    const { data: pipeline } = await (admin as any).rpc("pipeline_distribution");
    if (pipeline && Array.isArray(pipeline)) {
      return {
        items: pipeline.map((p: any) => ({
          status: p.status ?? "unknown",
          count: Number(p.count ?? 0),
          color: p.color ?? "#6B7280",
        })),
      };
    }
  } catch {
    // fallback
  }

  // Fallback: manual count
  const distribution = await countByField(ctx, "stage", "status");
  return {
    items: distribution.map((d) => ({
      status: d.value,
      count: d.count,
      color: "#6B7280",
    })),
  };
}

async function fetchTimelineData(
  admin: any,
  config: WidgetConfig
): Promise<any> {
  const limit = config.limit ?? 10;

  let query = (admin as any)
    .from("timeline_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (config.objectId) {
    query = query.eq("object_id", config.objectId);
  }

  const { data: events } = await query;
  return {
    events: (events ?? []).map((e: any) => ({
      id: e.id,
      eventType: e.event_type,
      title: e.title,
      description: e.description,
      createdAt: e.created_at,
    })),
  };
}

async function fetchTableViewData(
  admin: any,
  config: WidgetConfig
): Promise<any> {
  const limit = config.limit ?? 50;

  let query = admin
    .from("objects")
    .select("id, object_type_id, created_at, updated_at, object_types(name, display_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (config.objectType) {
    const { data: typeRow } = await admin
      .from("object_types")
      .select("id")
      .eq("name", config.objectType)
      .single();
    if (typeRow) {
      query = query.eq("object_type_id", typeRow.id);
    }
  }

  const { data: objects } = await query;
  if (!objects || objects.length === 0) return { rows: [], columns: [] };

  // Load all module data
  const objectIds = objects.map((o: any) => o.id);
  const { data: allMods } = await admin
    .from("object_modules")
    .select("object_id, data, modules(name)")
    .in("object_id", objectIds);

  const rows = objects.map((o: any) => {
    const objMods = (allMods ?? []).filter((m: any) => m.object_id === o.id);

    const row: Record<string, any> = {
      id: o.id,
      type: (o as any).object_types?.display_name ?? "Unknown",
      created: o.created_at,
    };

    for (const mod of objMods) {
      const modName = (mod as any).modules?.name ?? "unknown";
      if (mod.data && typeof mod.data === "object") {
        for (const [key, value] of Object.entries(mod.data as Record<string, unknown>)) {
          row[`${modName}.${key}`] = value;
        }
      }
    }

    return row;
  });

  // Derive columns
  const colSet = new Set<string>();
  colSet.add("type");
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (key !== "id" && key !== "created") colSet.add(key);
    }
  }
  colSet.add("created");

  return { rows, columns: Array.from(colSet) };
}
