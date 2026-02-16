"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as statusService from "../services/status.service";
import type { LeadStatusInsert, LeadStatusUpdate } from "../types/settings.types";

export async function getStatusesAction() {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");
  return statusService.getStatuses(ctx);
}

export async function createStatusAction(input: LeadStatusInsert) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const status = await statusService.createStatus(ctx, input);
  revalidatePath("/settings/statuses");
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  return status;
}

export async function updateStatusAction(id: string, input: LeadStatusUpdate) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const status = await statusService.updateStatus(ctx, id, input);
  revalidatePath("/settings/statuses");
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  return status;
}

export async function deleteStatusAction(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await statusService.deleteStatus(ctx, id);
  revalidatePath("/settings/statuses");
  revalidatePath("/pipeline");
  revalidatePath("/leads");
}

export async function reorderStatusesAction(orderedIds: string[]) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await statusService.reorderStatuses(ctx, orderedIds);
  revalidatePath("/settings/statuses");
  revalidatePath("/pipeline");
}
