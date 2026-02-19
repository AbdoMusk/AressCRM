"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as objectTypeService from "../services/object-type.service";
import type {
  ObjectTypeCreateInput,
  ObjectTypeUpdateInput,
} from "../types/object.types";

export async function createObjectTypeAction(
  input: ObjectTypeCreateInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    const type = await objectTypeService.createObjectType(ctx, input);
    revalidatePath("/registry");
    revalidatePath("/objects");
    return { success: true, data: { id: type.id } };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to create object type" };
  }
}

export async function updateObjectTypeAction(
  objectTypeId: string,
  input: ObjectTypeUpdateInput
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    await objectTypeService.updateObjectType(ctx, objectTypeId, input);
    revalidatePath("/registry");
    revalidatePath("/objects");
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to update object type" };
  }
}

export async function deleteObjectTypeAction(
  objectTypeId: string
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    await objectTypeService.deleteObjectType(ctx, objectTypeId);
    revalidatePath("/registry");
    revalidatePath("/objects");
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete object type" };
  }
}
