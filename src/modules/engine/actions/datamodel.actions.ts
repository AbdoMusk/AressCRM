"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as otrService from "../services/object-type-relation.service";
import * as objectTypeService from "../services/object-type.service";
import type { ObjectTypeRelationCreateInput } from "../types/relation.types";

// ── Schema-level Relation Actions ────────────

export async function createObjectTypeRelationAction(
  input: ObjectTypeRelationCreateInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    const rel = await otrService.createObjectTypeRelation(ctx, input);
    revalidatePath("/registry");
    return { success: true, data: { id: rel.id } };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to create relation" };
  }
}

export async function toggleObjectTypeRelationAction(
  relationId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    await otrService.toggleObjectTypeRelation(ctx, relationId, isActive);
    revalidatePath("/registry");
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to toggle relation" };
  }
}

export async function deleteObjectTypeRelationAction(
  relationId: string
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    await otrService.deleteObjectTypeRelation(ctx, relationId);
    revalidatePath("/registry");
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete relation" };
  }
}

// ── Object Type Activation Actions ───────────

export async function toggleObjectTypeActiveAction(
  objectTypeId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    await objectTypeService.updateObjectType(ctx, objectTypeId, { is_active: isActive });
    revalidatePath("/registry");
    revalidatePath("/objects");
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to toggle object type" };
  }
}
