"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import {
  createView,
  updateView,
  deleteView,
  type ViewCreateInput,
  type ViewUpdateInput,
} from "@/modules/engine/services/view.service";

export async function createViewAction(
  input: ViewCreateInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Not authenticated" };

    const view = await createView(ctx, input);
    revalidatePath("/view");
    return { success: true, data: { id: view.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create view",
    };
  }
}

export async function updateViewAction(
  viewId: string,
  input: ViewUpdateInput
): Promise<ActionResult<void>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Not authenticated" };

    await updateView(ctx, viewId, input);
    revalidatePath("/view");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update view",
    };
  }
}

export async function deleteViewAction(
  viewId: string
): Promise<ActionResult<void>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Not authenticated" };

    await deleteView(ctx, viewId);
    revalidatePath("/view");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete view",
    };
  }
}
