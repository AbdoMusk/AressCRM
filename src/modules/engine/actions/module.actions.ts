"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as moduleService from "../services/module.service";
import type { ModuleCreateInput, ModuleUpdateInput } from "../types/module.types";

export async function createModuleAction(
  input: ModuleCreateInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    const mod = await moduleService.createModule(ctx, input);
    revalidatePath("/registry");
    return { success: true, data: { id: mod.id } };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to create module" };
  }
}

export async function updateModuleAction(
  moduleId: string,
  input: ModuleUpdateInput
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    await moduleService.updateModule(ctx, moduleId, input);
    revalidatePath("/registry");
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to update module" };
  }
}

export async function deleteModuleAction(
  moduleId: string
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");
    await moduleService.deleteModule(ctx, moduleId);
    revalidatePath("/registry");
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete module" };
  }
}
