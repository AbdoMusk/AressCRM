/**
 * OMP Engine — View Service
 *
 * CRUD for saved view configurations per object type.
 * Views store layout type, filters, sorts, and visible fields.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/permissions/rbac";
import { AppError } from "@/lib/utils/errors";

// ── Types ────────────────────────────────────

export interface ViewFilter {
  module: string;
  field: string;
  operator: "eq" | "neq" | "contains" | "gt" | "lt" | "gte" | "lte" | "is_empty" | "is_not_empty" | "in";
  value: unknown;
}

export interface ViewSort {
  module: string;
  field: string;
  direction: "asc" | "desc";
}

export interface ViewFieldConfig {
  module: string;
  field: string;
  width?: number;
  position: number;
}

export interface View {
  id: string;
  objectTypeId: string;
  name: string;
  icon: string;
  layoutType: "table" | "kanban";
  kanbanFieldKey: string | null;
  kanbanModuleName: string | null;
  filters: ViewFilter[];
  sorts: ViewSort[];
  visibleFields: ViewFieldConfig[];
  groupByField: string | null;
  groupByModule: string | null;
  isDefault: boolean;
  visibility: "workspace" | "unlisted";
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ViewCreateInput {
  objectTypeId: string;
  name: string;
  icon?: string;
  layoutType?: "table" | "kanban";
  kanbanFieldKey?: string;
  kanbanModuleName?: string;
  filters?: ViewFilter[];
  sorts?: ViewSort[];
  visibleFields?: ViewFieldConfig[];
  groupByField?: string;
  groupByModule?: string;
  visibility?: "workspace" | "unlisted";
}

export interface ViewUpdateInput {
  name?: string;
  icon?: string;
  layoutType?: "table" | "kanban";
  kanbanFieldKey?: string | null;
  kanbanModuleName?: string | null;
  filters?: ViewFilter[];
  sorts?: ViewSort[];
  visibleFields?: ViewFieldConfig[];
  groupByField?: string | null;
  groupByModule?: string | null;
  visibility?: "workspace" | "unlisted";
}

// ── Helpers ──────────────────────────────────

function mapRow(row: any): View {
  return {
    id: row.id,
    objectTypeId: row.object_type_id,
    name: row.name,
    icon: row.icon ?? "List",
    layoutType: row.layout_type,
    kanbanFieldKey: row.kanban_field_key,
    kanbanModuleName: row.kanban_module_name,
    filters: (row.filters ?? []) as ViewFilter[],
    sorts: (row.sorts ?? []) as ViewSort[],
    visibleFields: (row.visible_fields ?? []) as ViewFieldConfig[],
    groupByField: row.group_by_field,
    groupByModule: row.group_by_module,
    isDefault: row.is_default,
    visibility: row.visibility,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Service Methods ──────────────────────────

/**
 * Get all views for an object type visible to the user.
 */
export async function getViewsForType(
  ctx: AuthContext,
  objectTypeId: string
): Promise<View[]> {
  const admin = createAdminClient();

  const { data, error } = await (admin as any)
    .from("views")
    .select("*")
    .eq("object_type_id", objectTypeId)
    .or(`visibility.eq.workspace,created_by.eq.${ctx.userId}`)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new AppError("DB_ERROR", error.message);
  return (data ?? []).map(mapRow);
}

/**
 * Get a single view by ID.
 */
export async function getView(viewId: string): Promise<View | null> {
  const admin = createAdminClient();

  const { data, error } = await (admin as any)
    .from("views")
    .select("*")
    .eq("id", viewId)
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

/**
 * Create a new view.
 */
export async function createView(
  ctx: AuthContext,
  input: ViewCreateInput
): Promise<View> {
  const admin = createAdminClient();

  const { data, error } = await (admin as any)
    .from("views")
    .insert({
      object_type_id: input.objectTypeId,
      name: input.name,
      icon: input.icon ?? "List",
      layout_type: input.layoutType ?? "table",
      kanban_field_key: input.kanbanFieldKey ?? null,
      kanban_module_name: input.kanbanModuleName ?? null,
      filters: (input.filters ?? []) as any,
      sorts: (input.sorts ?? []) as any,
      visible_fields: (input.visibleFields ?? []) as any,
      group_by_field: input.groupByField ?? null,
      group_by_module: input.groupByModule ?? null,
      visibility: input.visibility ?? "workspace",
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);
  return mapRow(data);
}

/**
 * Update a view.
 */
export async function updateView(
  ctx: AuthContext,
  viewId: string,
  input: ViewUpdateInput
): Promise<View> {
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.layoutType !== undefined) updateData.layout_type = input.layoutType;
  if (input.kanbanFieldKey !== undefined) updateData.kanban_field_key = input.kanbanFieldKey;
  if (input.kanbanModuleName !== undefined) updateData.kanban_module_name = input.kanbanModuleName;
  if (input.filters !== undefined) updateData.filters = input.filters as any;
  if (input.sorts !== undefined) updateData.sorts = input.sorts as any;
  if (input.visibleFields !== undefined) updateData.visible_fields = input.visibleFields as any;
  if (input.groupByField !== undefined) updateData.group_by_field = input.groupByField;
  if (input.groupByModule !== undefined) updateData.group_by_module = input.groupByModule;
  if (input.visibility !== undefined) updateData.visibility = input.visibility;

  const { data, error } = await (admin as any)
    .from("views")
    .update(updateData)
    .eq("id", viewId)
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);
  return mapRow(data);
}

/**
 * Delete a view. Cannot delete default views.
 */
export async function deleteView(
  ctx: AuthContext,
  viewId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: view } = await (admin as any)
    .from("views")
    .select("is_default, created_by")
    .eq("id", viewId)
    .single();

  if (!view) throw new AppError("NOT_FOUND", "View not found");
  if (view.is_default) throw new AppError("FORBIDDEN", "Cannot delete default view");

  const { error } = await (admin as any)
    .from("views")
    .delete()
    .eq("id", viewId);

  if (error) throw new AppError("DB_ERROR", error.message);
}

/**
 * Ensure a default "All" view exists for an object type.
 * Returns the default view (creates it if missing).
 */
export async function ensureDefaultView(
  ctx: AuthContext,
  objectTypeId: string,
  objectTypeDisplayName: string
): Promise<View> {
  const admin = createAdminClient();

  const { data: existing } = await (admin as any)
    .from("views")
    .select("*")
    .eq("object_type_id", objectTypeId)
    .eq("is_default", true)
    .single();

  if (existing) return mapRow(existing);

  // Create default "All" view
  const { data, error } = await (admin as any)
    .from("views")
    .insert({
      object_type_id: objectTypeId,
      name: `All ${objectTypeDisplayName}`,
      icon: "List",
      layout_type: "table",
      is_default: true,
      visibility: "workspace",
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);
  return mapRow(data);
}
