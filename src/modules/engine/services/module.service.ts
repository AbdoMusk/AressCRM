/**
 * OMP Engine — Module Service
 *
 * CRUD operations for the module registry.
 * Only admins with module:manage permission can create/update/delete.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/permissions/rbac";
import { requirePermission } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { AppError } from "@/lib/utils/errors";
import { auditLog } from "@/lib/audit/logger";
import type { Json } from "@/lib/supabase/database.types";
import type {
  ModuleRowTyped,
  ModuleCreateInput,
  ModuleUpdateInput,
} from "../types/module.types";
import { parseModuleSchema } from "../types/module.types";

/**
 * Get all registered modules.
 */
export async function getModules(
  ctx: AuthContext
): Promise<ModuleRowTyped[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("modules")
    .select("*")
    .order("name");

  if (error) throw new AppError("DB_ERROR", error.message);

  return (data ?? []).map((row) => ({
    ...row,
    schema: parseModuleSchema(row.schema),
  }));
}

/**
 * Get a single module by ID.
 */
export async function getModule(
  ctx: AuthContext,
  moduleId: string
): Promise<ModuleRowTyped> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  if (error || !data) throw new AppError("NOT_FOUND", "Module not found");

  return { ...data, schema: parseModuleSchema(data.schema) };
}

/**
 * Get a module by name.
 */
export async function getModuleByName(
  ctx: AuthContext,
  name: string
): Promise<ModuleRowTyped> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("modules")
    .select("*")
    .eq("name", name)
    .single();

  if (error || !data) throw new AppError("NOT_FOUND", `Module '${name}' not found`);

  return { ...data, schema: parseModuleSchema(data.schema) };
}

/**
 * Create a new module definition.
 */
export async function createModule(
  ctx: AuthContext,
  input: ModuleCreateInput
): Promise<ModuleRowTyped> {
  requirePermission(ctx, Actions.MODULE_MANAGE);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("modules")
    .insert({
      name: input.name,
      display_name: input.display_name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      schema: input.schema as unknown as Json,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new AppError("VALIDATION", `Module name '${input.name}' already exists`);
    }
    throw new AppError("DB_ERROR", error.message);
  }

  await auditLog(ctx, {
    action: "module:create",
    category: "settings",
    entityType: "module",
    entityId: data.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return { ...data, schema: parseModuleSchema(data.schema) };
}

/**
 * Update a module definition.
 */
export async function updateModule(
  ctx: AuthContext,
  moduleId: string,
  input: ModuleUpdateInput
): Promise<ModuleRowTyped> {
  requirePermission(ctx, Actions.MODULE_MANAGE);

  const admin = createAdminClient();

  // Get old values for audit
  const { data: old } = await admin
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  if (!old) throw new AppError("NOT_FOUND", "Module not found");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.display_name !== undefined) updateData.display_name = input.display_name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.schema !== undefined) updateData.schema = input.schema;

  const { data, error } = await admin
    .from("modules")
    .update(updateData)
    .eq("id", moduleId)
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "module:update",
    category: "settings",
    entityType: "module",
    entityId: moduleId,
    oldValues: old as unknown as Record<string, unknown>,
    newValues: input as unknown as Record<string, unknown>,
  });

  return { ...data, schema: parseModuleSchema(data.schema) };
}

/**
 * Delete a module definition.
 * Fails if any objects have data for this module.
 */
export async function deleteModule(
  ctx: AuthContext,
  moduleId: string
): Promise<void> {
  requirePermission(ctx, Actions.MODULE_MANAGE);

  const admin = createAdminClient();

  // Check for usage
  const { count } = await admin
    .from("object_modules")
    .select("*", { count: "exact", head: true })
    .eq("module_id", moduleId);

  if (count && count > 0) {
    throw new AppError(
      "VALIDATION",
      `Cannot delete module: ${count} objects still use it`
    );
  }

  const { data: old } = await admin
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  if (!old) throw new AppError("NOT_FOUND", "Module not found");

  const { error } = await admin
    .from("modules")
    .delete()
    .eq("id", moduleId);

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "module:delete",
    category: "settings",
    entityType: "module",
    entityId: moduleId,
    oldValues: old as unknown as Record<string, unknown>,
  });
}
