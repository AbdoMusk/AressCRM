"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as pageService from "../services/page.service";
import type { PageCreateInput, PageWidgetCreateInput, WidgetConfig } from "../services/page.service";

export async function createPageAction(
  input: PageCreateInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Not authenticated" };

    const page = await pageService.createPage(ctx, input);
    revalidatePath("/pages");
    return { success: true, data: { id: page.id, slug: page.slug } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create page",
    };
  }
}

export async function deletePageAction(
  pageId: string
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Not authenticated" };

    await pageService.deletePage(ctx, pageId);
    revalidatePath("/pages");
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete page",
    };
  }
}

export async function addWidgetAction(
  input: PageWidgetCreateInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Not authenticated" };

    const widget = await pageService.addWidget(ctx, input);
    revalidatePath("/pages");
    return { success: true, data: { id: widget.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add widget",
    };
  }
}

export async function removeWidgetAction(
  widgetId: string
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Not authenticated" };

    await pageService.removeWidget(ctx, widgetId);
    revalidatePath("/pages");
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove widget",
    };
  }
}

export async function updateWidgetAction(
  widgetId: string,
  updates: { title?: string; config?: WidgetConfig; width?: number; position?: number }
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Not authenticated" };

    await pageService.updateWidget(ctx, widgetId, updates);
    revalidatePath("/pages");
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update widget",
    };
  }
}
