"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as timelineService from "../services/timeline.service";

export async function addNoteAction(
  objectId: string,
  note: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Not authenticated" };

    const event = await timelineService.addTimelineNote(ctx, objectId, note);
    revalidatePath(`/objects/${objectId}`);
    return { success: true, data: { id: event.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add note",
    };
  }
}
