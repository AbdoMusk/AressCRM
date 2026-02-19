/**
 * OMP Engine — Relation Service
 *
 * Manages graph-based relationships between objects.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/permissions/rbac";
import { hasPermission, requirePermission } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { AppError } from "@/lib/utils/errors";
import { auditLog } from "@/lib/audit/logger";
import type { Json } from "@/lib/supabase/database.types";
import type { RelatedObject } from "../types/object.types";
import type { RelationCreateInput, RelationRow } from "../types/relation.types";

/**
 * Get all relations for an object (both directions).
 */
export async function getRelations(
  ctx: AuthContext,
  objectId: string
): Promise<RelatedObject[]> {
  const admin = createAdminClient();

  // Get outgoing relations
  const { data: outgoing } = await admin
    .from("object_relations")
    .select("*")
    .eq("from_object_id", objectId);

  // Get incoming relations
  const { data: incoming } = await admin
    .from("object_relations")
    .select("*")
    .eq("to_object_id", objectId);

  // Collect all related object IDs
  const relatedIds = new Set<string>();
  (outgoing ?? []).forEach((r) => relatedIds.add(r.to_object_id));
  (incoming ?? []).forEach((r) => relatedIds.add(r.from_object_id));

  if (relatedIds.size === 0) return [];

  // Load related objects with their type info
  const { data: relatedObjects } = await admin
    .from("objects")
    .select("id, object_types(name)")
    .in("id", [...relatedIds]);

  // Load module data for display names
  const { data: relatedMods } = await admin
    .from("object_modules")
    .select("object_id, data, modules(name)")
    .in("object_id", [...relatedIds]);

  // Build display names
  const displayNames = new Map<string, string>();
  for (const id of relatedIds) {
    const mods = (relatedMods ?? []).filter((m) => m.object_id === id);
    const identity = mods.find((m) => (m as any).modules?.name === "identity");
    const org = mods.find((m) => (m as any).modules?.name === "organization");

    if (identity?.data && (identity.data as any).name) {
      displayNames.set(id, String((identity.data as any).name));
    } else if (org?.data && (org.data as any).company_name) {
      displayNames.set(id, String((org.data as any).company_name));
    } else {
      displayNames.set(id, "Unnamed Object");
    }
  }

  const objectTypeMap = new Map<string, string>();
  (relatedObjects ?? []).forEach((e) => {
    objectTypeMap.set(e.id, (e as any).object_types?.name ?? "unknown");
  });

  const results: RelatedObject[] = [];

  for (const r of outgoing ?? []) {
    results.push({
      relationId: r.id,
      relationType: r.relation_type,
      direction: "to",
      object: {
        id: r.to_object_id,
        objectType: objectTypeMap.get(r.to_object_id) ?? "unknown",
        displayName: displayNames.get(r.to_object_id) ?? "Unnamed",
      },
    });
  }

  for (const r of incoming ?? []) {
    results.push({
      relationId: r.id,
      relationType: r.relation_type,
      direction: "from",
      object: {
        id: r.from_object_id,
        objectType: objectTypeMap.get(r.from_object_id) ?? "unknown",
        displayName: displayNames.get(r.from_object_id) ?? "Unnamed",
      },
    });
  }

  return results;
}

/**
 * Create a new relation between two objects.
 */
export async function createRelation(
  ctx: AuthContext,
  input: RelationCreateInput
): Promise<RelationRow> {
  requirePermission(ctx, Actions.RELATION_CREATE);

  const admin = createAdminClient();

  // Verify both objects exist
  const { data: fromObj } = await admin
    .from("objects")
    .select("id")
    .eq("id", input.fromObjectId)
    .single();

  if (!fromObj) throw new AppError("NOT_FOUND", "Source object not found");

  const { data: toObj } = await admin
    .from("objects")
    .select("id")
    .eq("id", input.toObjectId)
    .single();

  if (!toObj) throw new AppError("NOT_FOUND", "Target object not found");

  if (input.fromObjectId === input.toObjectId) {
    throw new AppError("VALIDATION", "Cannot create self-relation");
  }

  const { data, error } = await admin
    .from("object_relations")
    .insert({
      from_object_id: input.fromObjectId,
      to_object_id: input.toObjectId,
      relation_type: input.relationType,
      metadata: (input.metadata ?? {}) as unknown as Json,
    })
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "relation:create",
    category: "data",
    entityType: "relation",
    entityId: data.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return data;
}

/**
 * Delete a relation.
 */
export async function deleteRelation(
  ctx: AuthContext,
  relationId: string
): Promise<void> {
  requirePermission(ctx, Actions.RELATION_DELETE);

  const admin = createAdminClient();

  const { data: old } = await admin
    .from("object_relations")
    .select("*")
    .eq("id", relationId)
    .single();

  if (!old) throw new AppError("NOT_FOUND", "Relation not found");

  const { error } = await admin
    .from("object_relations")
    .delete()
    .eq("id", relationId);

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "relation:delete",
    category: "data",
    entityType: "relation",
    entityId: relationId,
    oldValues: old as unknown as Record<string, unknown>,
  });
}
