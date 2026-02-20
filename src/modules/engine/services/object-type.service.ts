/**
 * OMP Engine — Object Type Service
 *
 * CRUD operations for object type templates.
 * Object types define which modules an object must/can have.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/permissions/rbac";
import { requirePermission } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { AppError } from "@/lib/utils/errors";
import { auditLog } from "@/lib/audit/logger";
import type {
  ObjectTypeWithModules,
  ObjectTypeCreateInput,
  ObjectTypeUpdateInput,
} from "../types/object.types";

/**
 * Get all object types with their module mappings.
 */
export async function getObjectTypes(
  ctx: AuthContext
): Promise<ObjectTypeWithModules[]> {
  const admin = createAdminClient();

  const { data: types, error } = await admin
    .from("object_types")
    .select("*")
    .order("name");

  if (error) throw new AppError("DB_ERROR", error.message);

  // Load module mappings for each type
  const { data: mappings } = await admin
    .from("object_type_modules")
    .select("object_type_id, module_id, required, position, modules(name, display_name, icon)")
    .order("position");

  const result: ObjectTypeWithModules[] = (types ?? []).map((type) => {
    const typeModules = (mappings ?? [])
      .filter((m) => m.object_type_id === type.id)
      .map((m) => ({
        module_id: m.module_id,
        module_name: (m as any).modules?.name ?? "",
        display_name: (m as any).modules?.display_name ?? "",
        icon: (m as any).modules?.icon ?? null,
        required: m.required,
        position: m.position,
      }));

    return { ...type, modules: typeModules };
  });

  return result;
}

/**
 * Get a single object type with modules.
 */
export async function getObjectType(
  ctx: AuthContext,
  objectTypeId: string
): Promise<ObjectTypeWithModules> {
  const admin = createAdminClient();

  const { data: type, error } = await admin
    .from("object_types")
    .select("*")
    .eq("id", objectTypeId)
    .single();

  if (error || !type) throw new AppError("NOT_FOUND", "Object type not found");

  const { data: mappings } = await admin
    .from("object_type_modules")
    .select("module_id, required, position, modules(name, display_name, icon)")
    .eq("object_type_id", objectTypeId)
    .order("position");

  const modules = (mappings ?? []).map((m) => ({
    module_id: m.module_id,
    module_name: (m as any).modules?.name ?? "",
    display_name: (m as any).modules?.display_name ?? "",
    icon: (m as any).modules?.icon ?? null,
    required: m.required,
    position: m.position,
  }));

  return { ...type, modules };
}

/**
 * Get an object type by name.
 */
export async function getObjectTypeByName(
  ctx: AuthContext,
  name: string
): Promise<ObjectTypeWithModules> {
  const admin = createAdminClient();

  const { data: type, error } = await admin
    .from("object_types")
    .select("*")
    .eq("name", name)
    .single();

  if (error || !type) throw new AppError("NOT_FOUND", `Object type '${name}' not found`);

  const { data: mappings } = await admin
    .from("object_type_modules")
    .select("module_id, required, position, modules(name, display_name, icon)")
    .eq("object_type_id", type.id)
    .order("position");

  const modules = (mappings ?? []).map((m) => ({
    module_id: m.module_id,
    module_name: (m as any).modules?.name ?? "",
    display_name: (m as any).modules?.display_name ?? "",
    icon: (m as any).modules?.icon ?? null,
    required: m.required,
    position: m.position,
  }));

  return { ...type, modules };
}

/**
 * Create a new object type.
 */
export async function createObjectType(
  ctx: AuthContext,
  input: ObjectTypeCreateInput
): Promise<ObjectTypeWithModules> {
  requirePermission(ctx, Actions.OBJECT_TYPE_MANAGE);

  const admin = createAdminClient();

  const { data: type, error } = await admin
    .from("object_types")
    .insert({
      name: input.name,
      display_name: input.display_name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new AppError("VALIDATION", `Object type '${input.name}' already exists`);
    }
    throw new AppError("DB_ERROR", error.message);
  }

  // Insert module mappings
  if (input.modules.length > 0) {
    const { error: mapError } = await admin
      .from("object_type_modules")
      .insert(
        input.modules.map((m) => ({
          object_type_id: type.id,
          module_id: m.module_id,
          required: m.required,
          position: m.position,
        }))
      );

    if (mapError) throw new AppError("DB_ERROR", mapError.message);
  }

  await auditLog(ctx, {
    action: "object_type:create",
    category: "settings",
    entityType: "object_type",
    entityId: type.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return getObjectType(ctx, type.id);
}

/**
 * Update an object type.
 */
export async function updateObjectType(
  ctx: AuthContext,
  objectTypeId: string,
  input: ObjectTypeUpdateInput
): Promise<ObjectTypeWithModules> {
  requirePermission(ctx, Actions.OBJECT_TYPE_MANAGE);

  const admin = createAdminClient();

  const { data: old } = await admin
    .from("object_types")
    .select("*")
    .eq("id", objectTypeId)
    .single();

  if (!old) throw new AppError("NOT_FOUND", "Object type not found");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.display_name !== undefined) updateData.display_name = input.display_name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  if (Object.keys(updateData).length > 0) {
    const { error } = await admin
      .from("object_types")
      .update(updateData)
      .eq("id", objectTypeId);

    if (error) throw new AppError("DB_ERROR", error.message);
  }

  // Update module mappings if provided
  if (input.modules !== undefined) {
    // Delete existing mappings
    await admin
      .from("object_type_modules")
      .delete()
      .eq("object_type_id", objectTypeId);

    // Insert new mappings
    if (input.modules.length > 0) {
      const { error: mapError } = await admin
        .from("object_type_modules")
        .insert(
          input.modules.map((m) => ({
            object_type_id: objectTypeId,
            module_id: m.module_id,
            required: m.required,
            position: m.position,
          }))
        );

      if (mapError) throw new AppError("DB_ERROR", mapError.message);
    }
  }

  await auditLog(ctx, {
    action: "object_type:update",
    category: "settings",
    entityType: "object_type",
    entityId: objectTypeId,
    oldValues: old as unknown as Record<string, unknown>,
    newValues: input as unknown as Record<string, unknown>,
  });

  return getObjectType(ctx, objectTypeId);
}

/**
 * Delete an object type. Fails if objects of this type exist.
 */
export async function deleteObjectType(
  ctx: AuthContext,
  objectTypeId: string
): Promise<void> {
  requirePermission(ctx, Actions.OBJECT_TYPE_MANAGE);

  const admin = createAdminClient();

  const { count } = await admin
    .from("objects")
    .select("*", { count: "exact", head: true })
    .eq("object_type_id", objectTypeId);

  if (count && count > 0) {
    throw new AppError(
      "VALIDATION",
      `Cannot delete: ${count} objects of this type exist`
    );
  }

  const { data: old } = await admin
    .from("object_types")
    .select("*")
    .eq("id", objectTypeId)
    .single();

  if (!old) throw new AppError("NOT_FOUND", "Object type not found");

  const { error } = await admin
    .from("object_types")
    .delete()
    .eq("id", objectTypeId);

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "object_type:delete",
    category: "settings",
    entityType: "object_type",
    entityId: objectTypeId,
    oldValues: old as unknown as Record<string, unknown>,
  });
}
