"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as relationService from "../services/relation.service";
import type { RelationCreateInput } from "../types/relation.types";

export async function createRelationAction(
  input: RelationCreateInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    const relation = await relationService.createRelation(ctx, input);
    revalidatePath(`/objects/${input.fromObjectId}`);
    revalidatePath(`/objects/${input.toObjectId}`);
    return { success: true, data: { id: relation.id } };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to create relation" };
  }
}

export async function deleteRelationAction(
  relationId: string,
  objectId: string
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    await relationService.deleteRelation(ctx, relationId);
    revalidatePath(`/objects/${objectId}`);
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete relation" };
  }
}
