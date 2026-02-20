"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as marketplaceService from "../services/marketplace.service";

export async function submitProposalAction(
  projectId: string,
  proposalModules: Record<string, Record<string, unknown>>
): Promise<ActionResult<{ proposalId: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");

    const result = await marketplaceService.submitProposal(ctx, projectId, proposalModules);

    revalidatePath("/marketplace");
    revalidatePath(`/marketplace/${projectId}`);
    revalidatePath("/view");
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to submit proposal" };
  }
}

export async function acceptProposalAction(
  proposalId: string,
  projectId: string
): Promise<ActionResult<{ dealId: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");

    const result = await marketplaceService.acceptProposal(ctx, proposalId, projectId);

    revalidatePath("/marketplace");
    revalidatePath(`/marketplace/${projectId}`);
    revalidatePath("/view");
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to accept proposal" };
  }
}

export async function rejectProposalAction(
  proposalId: string,
  projectId: string
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Unauthorized");

    await marketplaceService.rejectProposal(ctx, proposalId, projectId);

    revalidatePath("/marketplace");
    revalidatePath(`/marketplace/${projectId}`);
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to reject proposal" };
  }
}
