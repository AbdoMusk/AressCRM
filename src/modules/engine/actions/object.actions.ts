"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as objectService from "../services/object.service";
import type { ObjectCreateInput } from "../types/object.types";

export async function createObjectAction(
  input: ObjectCreateInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    const obj = await objectService.createObject(ctx, input);
    revalidatePath("/objects");
    revalidatePath("/dashboard");
    return { success: true, data: { id: obj.id } };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to create object" };
  }
}

export async function updateObjectModuleAction(
  objectId: string,
  moduleId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    await objectService.updateObjectModule(ctx, objectId, moduleId, data);
    revalidatePath("/objects");
    revalidatePath(`/objects/${objectId}`);
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to update module" };
  }
}

export async function deleteObjectAction(
  objectId: string
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    await objectService.deleteObject(ctx, objectId);
    revalidatePath("/objects");
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete object" };
  }
}

export async function attachModuleAction(
  objectId: string,
  moduleId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    await objectService.attachModule(ctx, objectId, moduleId, data);
    revalidatePath(`/objects/${objectId}`);
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to attach module" };
  }
}

export async function detachModuleAction(
  objectId: string,
  moduleId: string
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    await objectService.detachModule(ctx, objectId, moduleId);
    revalidatePath(`/objects/${objectId}`);
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to detach module" };
  }
}
