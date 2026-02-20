/**
 * OMP Engine — Timeline Service
 *
 * Tracks lifecycle events for any object (status changes, notes, relations, etc.)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/permissions/rbac";
import { hasPermission } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { AppError } from "@/lib/utils/errors";

export interface TimelineEvent {
  id: string;
  objectId: string;
  eventType: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
}

export interface TimelineCreateInput {
  objectId: string;
  eventType: "status_change" | "note" | "relation_added" | "relation_removed" | "module_attached" | "module_detached" | "custom";
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Get timeline events for an object.
 */
export async function getTimeline(
  ctx: AuthContext,
  objectId: string,
  limit = 50
): Promise<TimelineEvent[]> {
  if (!hasPermission(ctx, Actions.OBJECT_READ) && !hasPermission(ctx, Actions.OBJECT_READ_OWN)) {
    throw new AppError("FORBIDDEN", "No read access");
  }

  const admin = createAdminClient();

  const { data, error } = await (admin as any)
    .from("timeline_events")
    .select("*")
    .eq("object_id", objectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new AppError("DB_ERROR", error.message);

  return (data ?? []).map((e: any) => ({
    id: e.id,
    objectId: e.object_id,
    eventType: e.event_type,
    title: e.title,
    description: e.description,
    metadata: (e.metadata ?? {}) as Record<string, unknown>,
    createdBy: e.created_by,
    createdAt: e.created_at,
  }));
}

/**
 * Create a timeline event.
 */
export async function createTimelineEvent(
  ctx: AuthContext,
  input: TimelineCreateInput
): Promise<TimelineEvent> {
  const admin = createAdminClient();

  const { data, error } = await (admin as any)
    .from("timeline_events")
    .insert({
      object_id: input.objectId,
      event_type: input.eventType,
      title: input.title,
      description: input.description ?? null,
      metadata: (input.metadata ?? {}) as any,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  return {
    id: data.id,
    objectId: data.object_id,
    eventType: data.event_type,
    title: data.title,
    description: data.description,
    metadata: (data.metadata ?? {}) as Record<string, unknown>,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

/**
 * Auto-track a status change on an object.
 */
export async function trackStatusChange(
  ctx: AuthContext,
  objectId: string,
  oldStatus: string,
  newStatus: string,
  moduleName = "stage"
): Promise<void> {
  await createTimelineEvent(ctx, {
    objectId,
    eventType: "status_change",
    title: `Status changed from "${oldStatus}" to "${newStatus}"`,
    metadata: { module: moduleName, oldValue: oldStatus, newValue: newStatus },
  });
}

/**
 * Add a note to an object's timeline.
 */
export async function addTimelineNote(
  ctx: AuthContext,
  objectId: string,
  note: string
): Promise<TimelineEvent> {
  return createTimelineEvent(ctx, {
    objectId,
    eventType: "note",
    title: "Note added",
    description: note,
  });
}
