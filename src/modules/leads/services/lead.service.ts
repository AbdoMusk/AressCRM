import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission, type AuthContext } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { auditLog } from "@/lib/audit/logger";
import { AppError } from "@/lib/utils/errors";
import { leadCreateSchema, leadUpdateSchema } from "../schemas/lead.schema";
import type { LeadInsert, LeadUpdate, LeadWithRelations, LeadRow } from "../types/lead.types";

const LEAD_SELECT =
  // CHANGE: Added table hint (profiles!) to resolve ambiguous FK relationships
  // Required because leads has TWO foreign keys to profiles (assigned_to and created_by)
  "*, assigned_to_profile:profiles!assigned_to(full_name), created_by_profile:profiles!created_by(full_name), lead_statuses(name, slug, color), lead_sources(name, slug), companies(id, name)";

export async function getLeads(ctx: AuthContext): Promise<LeadWithRelations[]> {
  // Support both full read and own-only read
  const canReadAll = ctx.permissions.has(Actions.LEAD_READ);
  const canReadOwn = ctx.permissions.has(Actions.LEAD_READ_OWN);
  if (!canReadAll && !canReadOwn) {
    throw new AppError("FORBIDDEN", "No permission to view leads");
  }

  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select(LEAD_SELECT)
    .order("created_at", { ascending: false });

  if (!canReadAll && canReadOwn) {
    query = query.or(`created_by.eq.${ctx.userId},assigned_to.eq.${ctx.userId}`);
  }

  const { data, error } = await query;
  if (error) throw new AppError("DB_ERROR", error.message);
  return data as LeadWithRelations[];
}

export async function getLead(
  ctx: AuthContext,
  id: string
): Promise<LeadWithRelations> {
  const canReadAll = ctx.permissions.has(Actions.LEAD_READ);
  const canReadOwn = ctx.permissions.has(Actions.LEAD_READ_OWN);
  if (!canReadAll && !canReadOwn) {
    throw new AppError("FORBIDDEN", "No permission to view leads");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) throw new AppError("NOT_FOUND", "Lead not found");

  // Ownership check if only own permission
  if (!canReadAll && canReadOwn) {
    if (data.created_by !== ctx.userId && data.assigned_to !== ctx.userId) {
      throw new AppError("FORBIDDEN", "Cannot view this lead");
    }
  }

  return data as LeadWithRelations;
}

export async function createLead(
  ctx: AuthContext,
  input: LeadInsert
): Promise<LeadRow> {
  requirePermission(ctx, Actions.LEAD_CREATE);
  const validated = leadCreateSchema.parse(input);

  // Auto-create company if text provided but no company_id selected
  if (validated.company && !validated.company_id) {
    try {
      const supabaseAdmin = createAdminClient();
      const { data: newCompany } = await supabaseAdmin
        .from("companies")
        .insert({ name: validated.company, created_by: ctx.userId })
        .select("id")
        .single();
      if (newCompany) {
        validated.company_id = newCompany.id;
      }
    } catch {
      // Non-critical: lead still gets the company text even if entity creation fails
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...validated, created_by: ctx.userId })
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.LEAD_CREATE,
    category: "data",
    entityType: "lead",
    entityId: data.id,
    newValues: data as unknown as Record<string, unknown>,
  });

  return data;
}

export async function updateLead(
  ctx: AuthContext,
  id: string,
  input: LeadUpdate
): Promise<LeadRow> {
  const supabase = await createClient();

  // Fetch existing lead for ownership check + audit old values (auth client can read)
  const { data: existing } = await supabase
    .from("leads")
    .select()
    .eq("id", id)
    .single();
  if (!existing) throw new AppError("NOT_FOUND", "Lead not found");

  // Permission: lead:update OR (lead:update:own AND ownership)
  const canUpdateAny = ctx.permissions.has(Actions.LEAD_UPDATE);
  const canUpdateOwn =
    ctx.permissions.has(Actions.LEAD_UPDATE_OWN) &&
    existing.created_by === ctx.userId;
  if (!canUpdateAny && !canUpdateOwn) {
    throw new AppError("FORBIDDEN", "Cannot update this lead");
  }

  const validated = leadUpdateSchema.parse(input);

  // If user has full lead:update permission, use admin client to bypass RLS
  // (RLS policy only allows own/assigned leads, but app permissions allow full access)
  const dbClient = canUpdateAny ? createAdminClient() : supabase;

  // Do the update
  const { error: updateError } = await dbClient
    .from("leads")
    .update(validated)
    .eq("id", id);

  if (updateError) {
    throw new AppError("DB_ERROR", updateError.message);
  }

  // Fetch the updated row
  const { data, error: selectError } = await dbClient
    .from("leads")
    .select()
    .eq("id", id)
    .single();

  if (selectError) {
    throw new AppError("DB_ERROR", `Failed to fetch updated lead: ${selectError.message}`);
  }

  if (!data) {
    throw new AppError("NOT_FOUND", "Lead not found after update");
  }

  const updatedLead = data;

  await auditLog(ctx, {
    action: Actions.LEAD_UPDATE,
    category: "data",
    entityType: "lead",
    entityId: id,
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: updatedLead as unknown as Record<string, unknown>,
  });

  return updatedLead;
}

export async function updateLeadStatus(
  ctx: AuthContext,
  id: string,
  statusId: string
): Promise<LeadRow> {
  // Support both full move and own-only move
  const canMoveAny = ctx.permissions.has(Actions.LEAD_MOVE);
  const canMoveOwn = ctx.permissions.has(Actions.LEAD_MOVE_OWN);
  if (!canMoveAny && !canMoveOwn) {
    throw new AppError("FORBIDDEN", "No permission to move leads");
  }

  if (!canMoveAny && canMoveOwn) {
    // Must verify ownership
    const supabase = await createClient();
    const { data: existing } = await supabase.from("leads").select("created_by, assigned_to").eq("id", id).single();
    if (!existing || (existing.created_by !== ctx.userId && existing.assigned_to !== ctx.userId)) {
      throw new AppError("FORBIDDEN", "Cannot move this lead");
    }
  }

  return updateLead(ctx, id, { status_id: statusId } as LeadUpdate);
}

export async function deleteLead(
  ctx: AuthContext,
  id: string
): Promise<void> {
  requirePermission(ctx, Actions.LEAD_DELETE);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("leads")
    .select()
    .eq("id", id)
    .single();
  if (!existing) throw new AppError("NOT_FOUND", "Lead not found");

  // Use admin client to bypass RLS (permission check already passed above)
  const dbClient = createAdminClient();
  const { error } = await dbClient.from("leads").delete().eq("id", id);
  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.LEAD_DELETE,
    category: "data",
    entityType: "lead",
    entityId: id,
    oldValues: existing as unknown as Record<string, unknown>,
  });
}
