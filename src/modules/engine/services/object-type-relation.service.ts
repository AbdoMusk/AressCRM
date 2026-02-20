/**
 * OMP Engine — Object Type Relation Service
 *
 * CRUD operations for schema-level relation definitions between object types.
 * These define how object types relate to each other (one-to-many, many-to-one, etc.)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/permissions/rbac";
import { requirePermission } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { AppError } from "@/lib/utils/errors";
import { auditLog } from "@/lib/audit/logger";
import type {
  ObjectTypeRelation,
  ObjectTypeRelationCreateInput,
} from "../types/relation.types";

/**
 * Get all schema-level relation definitions, optionally filtered by object type.
 */
export async function getObjectTypeRelations(
  ctx: AuthContext,
  objectTypeId?: string
): Promise<ObjectTypeRelation[]> {
  const admin = createAdminClient();

  let query = admin
    .from("object_type_relations")
    .select("*")
    .order("created_at", { ascending: false });

  if (objectTypeId) {
    query = query.or(
      `source_type_id.eq.${objectTypeId},target_type_id.eq.${objectTypeId}`
    );
  }

  const { data, error } = await query;
  if (error) throw new AppError("DB_ERROR", error.message);

  // Enrich with object type names
  const typeIds = new Set<string>();
  for (const rel of data ?? []) {
    typeIds.add(rel.source_type_id);
    typeIds.add(rel.target_type_id);
  }

  const { data: types } = await admin
    .from("object_types")
    .select("id, name, display_name")
    .in("id", Array.from(typeIds));

  const typeMap = new Map(
    (types ?? []).map((t) => [t.id, { name: t.name, display_name: t.display_name }])
  );

  return (data ?? []).map((rel) => ({
    ...rel,
    relation_type: rel.relation_type as ObjectTypeRelation["relation_type"],
    metadata: (rel.metadata as Record<string, unknown>) ?? {},
    source_type_name: typeMap.get(rel.source_type_id)?.name,
    source_type_display_name: typeMap.get(rel.source_type_id)?.display_name,
    target_type_name: typeMap.get(rel.target_type_id)?.name,
    target_type_display_name: typeMap.get(rel.target_type_id)?.display_name,
  }));
}

/**
 * Create a new schema-level relation definition.
 */
export async function createObjectTypeRelation(
  ctx: AuthContext,
  input: ObjectTypeRelationCreateInput
): Promise<ObjectTypeRelation> {
  requirePermission(ctx, Actions.OBJECT_TYPE_MANAGE);

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("object_type_relations")
    .insert({
      source_type_id: input.source_type_id,
      target_type_id: input.target_type_id,
      relation_type: input.relation_type,
      source_field_name: input.source_field_name,
      target_field_name: input.target_field_name,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new AppError(
        "VALIDATION",
        `A relation with field name '${input.source_field_name}' already exists on this object type`
      );
    }
    throw new AppError("DB_ERROR", error.message);
  }

  await auditLog(ctx, {
    action: "object_type_relation:create",
    category: "settings",
    entityType: "object_type_relation",
    entityId: data.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return {
    ...data,
    relation_type: data.relation_type as ObjectTypeRelation["relation_type"],
    metadata: (data.metadata as Record<string, unknown>) ?? {},
  };
}

/**
 * Toggle active state of a relation definition.
 */
export async function toggleObjectTypeRelation(
  ctx: AuthContext,
  relationId: string,
  isActive: boolean
): Promise<void> {
  requirePermission(ctx, Actions.OBJECT_TYPE_MANAGE);

  const admin = createAdminClient();

  const { error } = await admin
    .from("object_type_relations")
    .update({ is_active: isActive })
    .eq("id", relationId);

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: isActive
      ? "object_type_relation:activate"
      : "object_type_relation:deactivate",
    category: "settings",
    entityType: "object_type_relation",
    entityId: relationId,
    newValues: { is_active: isActive },
  });
}

/**
 * Delete a schema-level relation definition.
 */
export async function deleteObjectTypeRelation(
  ctx: AuthContext,
  relationId: string
): Promise<void> {
  requirePermission(ctx, Actions.OBJECT_TYPE_MANAGE);

  const admin = createAdminClient();

  const { data: old } = await admin
    .from("object_type_relations")
    .select("*")
    .eq("id", relationId)
    .single();

  if (!old) throw new AppError("NOT_FOUND", "Relation definition not found");

  const { error } = await admin
    .from("object_type_relations")
    .delete()
    .eq("id", relationId);

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "object_type_relation:delete",
    category: "settings",
    entityType: "object_type_relation",
    entityId: relationId,
    oldValues: old as unknown as Record<string, unknown>,
  });
}
