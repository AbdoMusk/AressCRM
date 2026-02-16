"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as leadService from "../services/lead.service";
import type { LeadInsert, LeadUpdate } from "../types/lead.types";

export async function createLeadAction(input: LeadInsert) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const lead = await leadService.createLead(ctx, input);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return lead;
}

export async function updateLeadAction(id: string, input: LeadUpdate) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const lead = await leadService.updateLead(ctx, id, input);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return lead;
}

export async function moveLeadAction(id: string, statusId: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const lead = await leadService.updateLeadStatus(ctx, id, statusId);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return lead;
}

export async function deleteLeadAction(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await leadService.deleteLead(ctx, id);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}
