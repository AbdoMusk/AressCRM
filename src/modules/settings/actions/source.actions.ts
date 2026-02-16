"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as sourceService from "../services/source.service";
import type { LeadSourceInsert, LeadSourceUpdate } from "../types/settings.types";

export async function getSourcesAction() {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");
  return sourceService.getSources(ctx);
}

export async function createSourceAction(input: LeadSourceInsert) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const source = await sourceService.createSource(ctx, input);
  revalidatePath("/settings/sources");
  revalidatePath("/leads");
  return source;
}

export async function updateSourceAction(id: string, input: LeadSourceUpdate) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const source = await sourceService.updateSource(ctx, id, input);
  revalidatePath("/settings/sources");
  revalidatePath("/leads");
  return source;
}

export async function deleteSourceAction(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await sourceService.deleteSource(ctx, id);
  revalidatePath("/settings/sources");
  revalidatePath("/leads");
}

export async function reorderSourcesAction(orderedIds: string[]) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await sourceService.reorderSources(ctx, orderedIds);
  revalidatePath("/settings/sources");
}
