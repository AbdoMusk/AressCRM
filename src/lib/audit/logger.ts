import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/permissions/rbac";
import type { Json } from "@/lib/supabase/database.types";

export type AuditCategory = "auth" | "data" | "settings" | "admin";

interface AuditEntry {
  action: string;
  category: AuditCategory;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an audit entry for an authenticated user action.
 * CHANGE: Cast values to Json type for Supabase compatibility
 */
export async function auditLog(
  ctx: AuthContext,
  entry: AuditEntry
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("audit_logs").insert({
    user_id: ctx.userId,
    action: entry.action,
    category: entry.category,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    old_values: (entry.oldValues as Json) ?? null,
    new_values: (entry.newValues as Json) ?? null,
    metadata: (entry.metadata as Json) ?? {},
  });
}

/**
 * Logs an audit entry for system / unauthenticated events (e.g. failed login).
 * Uses the service-role client to bypass RLS.
 * CHANGE: Cast values to Json type for Supabase compatibility
 */
export async function auditLogSystem(
  entry: AuditEntry & { userId?: string }
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    user_id: entry.userId ?? null,
    action: entry.action,
    category: entry.category,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    old_values: (entry.oldValues as Json) ?? null,
    new_values: (entry.newValues as Json) ?? null,
    metadata: (entry.metadata as Json) ?? {},
  });
}
