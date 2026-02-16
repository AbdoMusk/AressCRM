import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, type AuthContext } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { auditLog } from "@/lib/audit/logger";
import { AppError } from "@/lib/utils/errors";
import { sourceCreateSchema, sourceUpdateSchema } from "../schemas/settings.schema";
import type {
  LeadSourceRow,
  LeadSourceInsert,
  LeadSourceUpdate,
} from "../types/settings.types";

export async function getSources(ctx: AuthContext): Promise<LeadSourceRow[]> {
  requirePermission(ctx, Actions.SETTINGS_SOURCE_READ);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lead_sources")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw new AppError("DB_ERROR", error.message);
  return data;
}

export async function createSource(
  ctx: AuthContext,
  input: LeadSourceInsert
): Promise<LeadSourceRow> {
  requirePermission(ctx, Actions.SETTINGS_SOURCE_CREATE);
  const validated = sourceCreateSchema.parse(input);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lead_sources")
    .insert(validated)
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.SETTINGS_SOURCE_CREATE,
    category: "settings",
    entityType: "lead_source",
    entityId: data.id,
    newValues: data as unknown as Record<string, unknown>,
  });

  return data;
}

export async function updateSource(
  ctx: AuthContext,
  id: string,
  input: LeadSourceUpdate
): Promise<LeadSourceRow> {
  requirePermission(ctx, Actions.SETTINGS_SOURCE_UPDATE);

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("lead_sources")
    .select()
    .eq("id", id)
    .single();
  if (!existing) throw new AppError("NOT_FOUND", "Source not found");

  const validated = sourceUpdateSchema.parse(input);

  const { data, error } = await admin
    .from("lead_sources")
    .update(validated)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.SETTINGS_SOURCE_UPDATE,
    category: "settings",
    entityType: "lead_source",
    entityId: id,
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: data as unknown as Record<string, unknown>,
  });

  return data;
}

export async function deleteSource(
  ctx: AuthContext,
  id: string
): Promise<void> {
  requirePermission(ctx, Actions.SETTINGS_SOURCE_DELETE);

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("lead_sources")
    .select()
    .eq("id", id)
    .single();
  if (!existing) throw new AppError("NOT_FOUND", "Source not found");

  // Check if any leads reference this source
  const { count } = await admin
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("source_id", id);

  if (count && count > 0) {
    throw new AppError(
      "VALIDATION",
      `Cannot delete source "${existing.name}" — it is used by ${count} lead(s). Reassign them first.`
    );
  }

  const { error } = await admin.from("lead_sources").delete().eq("id", id);
  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.SETTINGS_SOURCE_DELETE,
    category: "settings",
    entityType: "lead_source",
    entityId: id,
    oldValues: existing as unknown as Record<string, unknown>,
  });
}

/** Reorder sources by passing an ordered array of IDs */
export async function reorderSources(
  ctx: AuthContext,
  orderedIds: string[]
): Promise<void> {
  requirePermission(ctx, Actions.SETTINGS_SOURCE_UPDATE);

  const admin = createAdminClient();
  const updates = orderedIds.map((id, index) =>
    admin.from("lead_sources").update({ position: index }).eq("id", id)
  );

  await Promise.all(updates);

  await auditLog(ctx, {
    action: Actions.SETTINGS_SOURCE_UPDATE,
    category: "settings",
    entityType: "lead_source",
    metadata: { reorder: orderedIds },
  });
}
