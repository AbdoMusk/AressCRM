import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, type AuthContext } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { auditLog } from "@/lib/audit/logger";
import { AppError } from "@/lib/utils/errors";
import { statusCreateSchema, statusUpdateSchema } from "../schemas/settings.schema";
import type {
  LeadStatusRow,
  LeadStatusInsert,
  LeadStatusUpdate,
} from "../types/settings.types";

export async function getStatuses(ctx: AuthContext): Promise<LeadStatusRow[]> {
  requirePermission(ctx, Actions.SETTINGS_STATUS_READ);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lead_statuses")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw new AppError("DB_ERROR", error.message);
  return data;
}

export async function createStatus(
  ctx: AuthContext,
  input: LeadStatusInsert
): Promise<LeadStatusRow> {
  requirePermission(ctx, Actions.SETTINGS_STATUS_CREATE);
  const validated = statusCreateSchema.parse(input);

  // Use admin client because RLS restricts writes to service_role
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lead_statuses")
    .insert(validated)
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.SETTINGS_STATUS_CREATE,
    category: "settings",
    entityType: "lead_status",
    entityId: data.id,
    newValues: data as unknown as Record<string, unknown>,
  });

  return data;
}

export async function updateStatus(
  ctx: AuthContext,
  id: string,
  input: LeadStatusUpdate
): Promise<LeadStatusRow> {
  requirePermission(ctx, Actions.SETTINGS_STATUS_UPDATE);

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("lead_statuses")
    .select()
    .eq("id", id)
    .single();
  if (!existing) throw new AppError("NOT_FOUND", "Status not found");

  const validated = statusUpdateSchema.parse(input);

  const { data, error } = await admin
    .from("lead_statuses")
    .update(validated)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.SETTINGS_STATUS_UPDATE,
    category: "settings",
    entityType: "lead_status",
    entityId: id,
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: data as unknown as Record<string, unknown>,
  });

  return data;
}

export async function deleteStatus(
  ctx: AuthContext,
  id: string
): Promise<void> {
  requirePermission(ctx, Actions.SETTINGS_STATUS_DELETE);

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("lead_statuses")
    .select()
    .eq("id", id)
    .single();
  if (!existing) throw new AppError("NOT_FOUND", "Status not found");

  // Check if any leads are using this status
  const { count } = await admin
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("status_id", id);

  if (count && count > 0) {
    throw new AppError(
      "VALIDATION",
      `Cannot delete status "${existing.name}" — it is used by ${count} lead(s). Reassign them first.`
    );
  }

  const { error } = await admin.from("lead_statuses").delete().eq("id", id);
  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.SETTINGS_STATUS_DELETE,
    category: "settings",
    entityType: "lead_status",
    entityId: id,
    oldValues: existing as unknown as Record<string, unknown>,
  });
}

/** Reorder statuses by passing an ordered array of IDs */
export async function reorderStatuses(
  ctx: AuthContext,
  orderedIds: string[]
): Promise<void> {
  requirePermission(ctx, Actions.SETTINGS_STATUS_UPDATE);

  const admin = createAdminClient();
  const updates = orderedIds.map((id, index) =>
    admin.from("lead_statuses").update({ position: index }).eq("id", id)
  );

  await Promise.all(updates);

  await auditLog(ctx, {
    action: Actions.SETTINGS_STATUS_UPDATE,
    category: "settings",
    entityType: "lead_status",
    metadata: { reorder: orderedIds },
  });
}
