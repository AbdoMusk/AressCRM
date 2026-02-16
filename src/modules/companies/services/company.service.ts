import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission, type AuthContext } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { auditLog } from "@/lib/audit/logger";
import { AppError } from "@/lib/utils/errors";
import { companyCreateSchema, companyUpdateSchema } from "../schemas/company.schema";
import type {
  CompanyRow,
  CompanyInsert,
  CompanyUpdate,
  CompanyWithRelations,
  CompanyOption,
  CompanyMemberWithProfile,
} from "../types/company.types";

const COMPANY_SELECT =
  "*, assigned_to_profile:profiles!assigned_to(full_name), created_by_profile:profiles!created_by(full_name)";

// ────────────────────────────────────────────────────────────
// READ
// ────────────────────────────────────────────────────────────

export async function getCompanies(ctx: AuthContext): Promise<CompanyWithRelations[]> {
  const canReadAll = ctx.permissions.has(Actions.COMPANY_READ);
  const canReadOwn = ctx.permissions.has(Actions.COMPANY_READ_OWN);
  if (!canReadAll && !canReadOwn) {
    throw new AppError("FORBIDDEN", "No permission to view companies");
  }

  const supabase = await createClient();
  let query = supabase
    .from("companies")
    .select(COMPANY_SELECT)
    .order("name");

  if (!canReadAll && canReadOwn) {
    // Only own/assigned companies
    query = query.or(`created_by.eq.${ctx.userId},assigned_to.eq.${ctx.userId}`);
  }

  const { data, error } = await query;
  if (error) throw new AppError("DB_ERROR", error.message);
  return data as CompanyWithRelations[];
}

export async function getCompany(
  ctx: AuthContext,
  id: string
): Promise<CompanyWithRelations> {
  const canReadAll = ctx.permissions.has(Actions.COMPANY_READ);
  const canReadOwn = ctx.permissions.has(Actions.COMPANY_READ_OWN);
  if (!canReadAll && !canReadOwn) {
    throw new AppError("FORBIDDEN", "No permission to view companies");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) throw new AppError("NOT_FOUND", "Company not found");

  // Ownership check if only own permission
  if (!canReadAll && canReadOwn) {
    if (data.created_by !== ctx.userId && data.assigned_to !== ctx.userId) {
      throw new AppError("FORBIDDEN", "Cannot view this company");
    }
  }

  return data as CompanyWithRelations;
}

/** Returns a lightweight list of all company names for autocomplete */
export async function getCompanyOptions(ctx: AuthContext): Promise<CompanyOption[]> {
  // Any company permission allows listing options
  const canRead = ctx.permissions.has(Actions.COMPANY_READ) ||
    ctx.permissions.has(Actions.COMPANY_READ_OWN) ||
    ctx.permissions.has(Actions.LEAD_READ) ||
    ctx.permissions.has(Actions.LEAD_CREATE);
  if (!canRead) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  return (data ?? []) as CompanyOption[];
}

// ────────────────────────────────────────────────────────────
// CREATE
// ────────────────────────────────────────────────────────────

export async function createCompany(
  ctx: AuthContext,
  input: CompanyInsert
): Promise<CompanyRow> {
  requirePermission(ctx, Actions.COMPANY_CREATE);
  const validated = companyCreateSchema.parse(input);

  // Clean empty website
  if (validated.website === "") validated.website = null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...validated, created_by: ctx.userId })
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.COMPANY_CREATE,
    category: "data",
    entityType: "company",
    entityId: data.id,
    newValues: data as unknown as Record<string, unknown>,
  });

  return data;
}

/** Creates a company quickly just from a name (used when creating a lead with a new company) */
export async function createCompanyQuick(
  ctx: AuthContext,
  name: string
): Promise<CompanyRow> {
  requirePermission(ctx, Actions.COMPANY_CREATE);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({ name, created_by: ctx.userId })
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);
  return data;
}

// ────────────────────────────────────────────────────────────
// UPDATE
// ────────────────────────────────────────────────────────────

export async function updateCompany(
  ctx: AuthContext,
  id: string,
  input: CompanyUpdate
): Promise<CompanyRow> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("companies")
    .select()
    .eq("id", id)
    .single();
  if (!existing) throw new AppError("NOT_FOUND", "Company not found");

  const canUpdateAny = ctx.permissions.has(Actions.COMPANY_UPDATE);
  const canUpdateOwn =
    ctx.permissions.has(Actions.COMPANY_UPDATE_OWN) &&
    (existing.created_by === ctx.userId || existing.assigned_to === ctx.userId);
  if (!canUpdateAny && !canUpdateOwn) {
    throw new AppError("FORBIDDEN", "Cannot update this company");
  }

  const validated = companyUpdateSchema.parse(input);
  if (validated.website === "") validated.website = null;

  const dbClient = canUpdateAny ? createAdminClient() : supabase;

  const { error: updateError } = await dbClient
    .from("companies")
    .update(validated)
    .eq("id", id);

  if (updateError) throw new AppError("DB_ERROR", updateError.message);

  const { data, error: selectError } = await dbClient
    .from("companies")
    .select()
    .eq("id", id)
    .single();

  if (selectError || !data) throw new AppError("DB_ERROR", "Failed to fetch updated company");

  await auditLog(ctx, {
    action: Actions.COMPANY_UPDATE,
    category: "data",
    entityType: "company",
    entityId: id,
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: data as unknown as Record<string, unknown>,
  });

  return data;
}

// ────────────────────────────────────────────────────────────
// DELETE
// ────────────────────────────────────────────────────────────

export async function deleteCompany(
  ctx: AuthContext,
  id: string
): Promise<void> {
  requirePermission(ctx, Actions.COMPANY_DELETE);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("companies")
    .select()
    .eq("id", id)
    .single();
  if (!existing) throw new AppError("NOT_FOUND", "Company not found");

  const dbClient = createAdminClient();
  const { error } = await dbClient.from("companies").delete().eq("id", id);
  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.COMPANY_DELETE,
    category: "data",
    entityType: "company",
    entityId: id,
    oldValues: existing as unknown as Record<string, unknown>,
  });
}

// ────────────────────────────────────────────────────────────
// MEMBERS
// ────────────────────────────────────────────────────────────

export async function getCompanyMembers(
  ctx: AuthContext,
  companyId: string
): Promise<CompanyMemberWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_members")
    .select("*, profiles(full_name)")
    .eq("company_id", companyId)
    .order("created_at");

  if (error) throw new AppError("DB_ERROR", error.message);
  return data as CompanyMemberWithProfile[];
}

export async function addCompanyMember(
  ctx: AuthContext,
  companyId: string,
  userId: string,
  role: string = "member"
): Promise<void> {
  requirePermission(ctx, Actions.COMPANY_MEMBERS_MANAGE);
  const dbClient = createAdminClient();

  const { error } = await dbClient
    .from("company_members")
    .upsert({ company_id: companyId, user_id: userId, role });

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.COMPANY_MEMBERS_MANAGE,
    category: "data",
    entityType: "company_member",
    entityId: companyId,
    newValues: { company_id: companyId, user_id: userId, role },
  });
}

export async function removeCompanyMember(
  ctx: AuthContext,
  companyId: string,
  userId: string
): Promise<void> {
  requirePermission(ctx, Actions.COMPANY_MEMBERS_MANAGE);
  const dbClient = createAdminClient();

  const { error } = await dbClient
    .from("company_members")
    .delete()
    .eq("company_id", companyId)
    .eq("user_id", userId);

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.COMPANY_MEMBERS_MANAGE,
    category: "data",
    entityType: "company_member",
    entityId: companyId,
    oldValues: { company_id: companyId, user_id: userId },
  });
}
