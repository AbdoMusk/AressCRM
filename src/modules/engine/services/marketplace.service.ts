/**
 * OMP Engine — Marketplace Service
 *
 * Queries public project objects (those with a `public_project` module whose
 * boolean field is `true`) and orchestrates the proposal → deal workflow
 * without touching core engine internals.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/permissions/rbac";
import { AppError } from "@/lib/utils/errors";
import { auditLog } from "@/lib/audit/logger";
import type { Json } from "@/lib/supabase/database.types";
import type { ObjectWithModules } from "../types/object.types";
import type { AttachedModule, ModuleSchema } from "../types/module.types";
import { parseModuleSchema } from "../types/module.types";

/* ------------------------------------------------------------------ */
/*  Helpers (mirrored from object.service to avoid coupling)          */
/* ------------------------------------------------------------------ */

function buildDisplayName(modules: AttachedModule[]): string {
  const identity = modules.find((c) => c.moduleName === "identity");
  if (identity?.data?.name) return String(identity.data.name);
  const org = modules.find((c) => c.moduleName === "organization");
  if (org?.data?.company_name) return String(org.data.company_name);
  for (const c of modules) {
    if (c.data?.name) return String(c.data.name);
    if (c.data?.title) return String(c.data.title);
  }
  return "Unnamed Project";
}

function buildAttachedModules(
  objectModules: any[],
  moduleDefs: Map<string, { name: string; display_name: string; icon: string | null; schema: Json }>
): AttachedModule[] {
  return objectModules.map((om) => {
    const def = moduleDefs.get(om.module_id);
    return {
      id: om.id,
      moduleId: om.module_id,
      moduleName: def?.name ?? "unknown",
      displayName: def?.display_name ?? "Unknown",
      icon: def?.icon ?? null,
      schema: def ? parseModuleSchema(def.schema) : { fields: [] },
      data: (om.data ?? {}) as Record<string, unknown>,
    };
  });
}

function hydrateObject(
  obj: any,
  objModules: any[],
  moduleDefs: Map<string, any>
): ObjectWithModules {
  const oMods = objModules.filter((om) => om.object_id === obj.id);
  const attached = buildAttachedModules(oMods, moduleDefs);
  return {
    ...obj,
    object_type: obj.object_types ?? obj.object_type,
    modules: attached,
    displayName: buildDisplayName(attached),
  } as ObjectWithModules;
}

/* ------------------------------------------------------------------ */
/*  Marketplace Queries                                               */
/* ------------------------------------------------------------------ */

export interface MarketplaceProject extends ObjectWithModules {
  proposalCount: number;
  ownerName: string;
}

/**
 * Get all projects whose `public_project` module has at least one boolean
 * field set to true.
 */
export async function getMarketplaceProjects(
  ctx: AuthContext
): Promise<MarketplaceProject[]> {
  const admin = createAdminClient();

  // 1. Find the "public_project" module definition
  const { data: pubModule } = await admin
    .from("modules")
    .select("id, schema")
    .eq("name", "public_project")
    .single();

  if (!pubModule) return [];

  // 2. Determine boolean field keys
  const schema = parseModuleSchema(pubModule.schema);
  const booleanFields = schema.fields.filter((f) => f.type === "boolean");
  if (booleanFields.length === 0) return [];

  // 3. Find object_modules rows where any boolean field is true
  const { data: pubOMs } = await admin
    .from("object_modules")
    .select("object_id, data")
    .eq("module_id", pubModule.id);

  const publicObjectIds = (pubOMs ?? [])
    .filter((om) => {
      const data = om.data as Record<string, unknown> | null;
      if (!data) return false;
      return booleanFields.some((f) => data[f.key] === true);
    })
    .map((om) => om.object_id);

  if (publicObjectIds.length === 0) return [];

  // 4. Load module definitions
  const { data: allModules } = await admin.from("modules").select("*");
  const moduleDefs = new Map((allModules ?? []).map((m) => [m.id, m]));

  // 5. Load objects
  const { data: objects } = await admin
    .from("objects")
    .select("*, object_types(*)")
    .in("id", publicObjectIds)
    .order("created_at", { ascending: false });

  if (!objects || objects.length === 0) return [];

  // 6. Load attached modules
  const { data: objModules } = await admin
    .from("object_modules")
    .select("*")
    .in("object_id", publicObjectIds);

  // 7. Count proposals per project
  const { data: proposalRelations } = await admin
    .from("object_relations")
    .select("to_object_id")
    .in("to_object_id", publicObjectIds)
    .eq("relation_type", "proposal_for");

  const proposalCounts = new Map<string, number>();
  (proposalRelations ?? []).forEach((r) => {
    proposalCounts.set(r.to_object_id, (proposalCounts.get(r.to_object_id) ?? 0) + 1);
  });

  // 8. Resolve owner names
  const ownerIds = [...new Set(objects.map((o) => o.owner_id ?? o.created_by).filter(Boolean))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", ownerIds);
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  // 9. Build result
  return objects.map((obj) => {
    const hydrated = hydrateObject(obj, objModules ?? [], moduleDefs);
    return {
      ...hydrated,
      proposalCount: proposalCounts.get(obj.id) ?? 0,
      ownerName: nameMap.get(obj.owner_id ?? obj.created_by) ?? "Unknown",
    } as MarketplaceProject;
  });
}

/* ------------------------------------------------------------------ */
/*  Single project detail + proposals                                 */
/* ------------------------------------------------------------------ */

export interface ProposalWithMeta extends ObjectWithModules {
  proposerName: string;
  proposerEmail: string;
  status: string;
}

export interface MarketplaceProjectDetail {
  project: MarketplaceProject;
  proposals: ProposalWithMeta[];
  userProposal: ProposalWithMeta | null;
  isOwner: boolean;
  /** Module schemas the proposal type expects (for the submission form). */
  proposalTypeModules: {
    moduleId: string;
    moduleName: string;
    displayName: string;
    required: boolean;
    schema: ModuleSchema;
  }[];
}

export async function getMarketplaceProject(
  ctx: AuthContext,
  projectId: string
): Promise<MarketplaceProjectDetail> {
  const admin = createAdminClient();

  // Module defs
  const { data: allModules } = await admin.from("modules").select("*");
  const moduleDefs = new Map((allModules ?? []).map((m) => [m.id, m]));

  // Load project
  const { data: obj, error } = await admin
    .from("objects")
    .select("*, object_types(*)")
    .eq("id", projectId)
    .single();
  if (error || !obj) throw new AppError("NOT_FOUND", "Project not found");

  const { data: projOMs } = await admin
    .from("object_modules")
    .select("*")
    .eq("object_id", projectId);
  const projectHydrated = hydrateObject(obj, projOMs ?? [], moduleDefs);

  // Verify it's public
  const pubMod = projectHydrated.modules.find((m) => m.moduleName === "public_project");
  if (!pubMod) throw new AppError("NOT_FOUND", "Project is not listed on the marketplace");
  const boolFields = pubMod.schema.fields.filter((f) => f.type === "boolean");
  const isPublic = boolFields.some((f) => pubMod.data[f.key] === true);
  if (!isPublic) throw new AppError("NOT_FOUND", "Project is not listed on the marketplace");

  const isOwner = obj.owner_id === ctx.userId || obj.created_by === ctx.userId;

  // Owner name
  const ownerId = obj.owner_id ?? obj.created_by;
  let ownerName = "Unknown";
  if (ownerId) {
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", ownerId).single();
    if (profile) ownerName = profile.full_name;
  }

  const project: MarketplaceProject = {
    ...projectHydrated,
    proposalCount: 0,
    ownerName,
  };

  // --- Load proposals related to this project ---
  const { data: relationsTo } = await admin
    .from("object_relations")
    .select("from_object_id")
    .eq("to_object_id", projectId)
    .eq("relation_type", "proposal_for");

  const proposalIds = (relationsTo ?? []).map((r) => r.from_object_id);
  project.proposalCount = proposalIds.length;

  let proposals: ProposalWithMeta[] = [];
  let userProposal: ProposalWithMeta | null = null;

  if (proposalIds.length > 0) {
    const { data: propObjects } = await admin
      .from("objects")
      .select("*, object_types(*)")
      .in("id", proposalIds)
      .order("created_at", { ascending: false });

    const { data: propOMs } = await admin
      .from("object_modules")
      .select("*")
      .in("object_id", proposalIds);

    // Proposer info
    const creatorIds = [...new Set((propObjects ?? []).map((p) => p.created_by).filter(Boolean))];
    const { data: propProfiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", creatorIds);
    const profileMap = new Map((propProfiles ?? []).map((p) => [p.id, p.full_name]));

    proposals = (propObjects ?? []).map((po) => {
      const hydrated = hydrateObject(po, propOMs ?? [], moduleDefs);

      // Derive status from stage / proposal_status module
      let status = "pending";
      for (const m of hydrated.modules) {
        if (m.moduleName === "stage" || m.moduleName === "proposal_status") {
          const s = (m.data?.status ?? m.data?.stage) as string | undefined;
          if (s) status = s;
        }
      }

      const result: ProposalWithMeta = {
        ...hydrated,
        proposerName: profileMap.get(po.created_by) ?? "Unknown",
        proposerEmail: po.created_by ?? "",
        status,
      };

      if (po.created_by === ctx.userId || po.owner_id === ctx.userId) {
        userProposal = result;
      }
      return result;
    });
  }

  // --- Load proposal type schemas for the submission form ---
  const { data: proposalType } = await admin
    .from("object_types")
    .select("id")
    .eq("name", "proposal")
    .single();

  let proposalTypeModules: MarketplaceProjectDetail["proposalTypeModules"] = [];

  if (proposalType) {
    const { data: typeModules } = await admin
      .from("object_type_modules")
      .select("module_id, required, position, modules(id, name, display_name, schema)")
      .eq("object_type_id", proposalType.id)
      .order("position");

    proposalTypeModules = (typeModules ?? []).map((tm) => {
      const mod = (tm as any).modules;
      return {
        moduleId: mod.id as string,
        moduleName: mod.name as string,
        displayName: mod.display_name as string,
        required: tm.required,
        schema: parseModuleSchema(mod.schema),
      };
    });
  }

  return { project, proposals, userProposal, isOwner, proposalTypeModules };
}

/* ------------------------------------------------------------------ */
/*  Proposal Submission                                               */
/* ------------------------------------------------------------------ */

export async function submitProposal(
  ctx: AuthContext,
  projectId: string,
  proposalModules: Record<string, Record<string, unknown>>
): Promise<{ proposalId: string }> {
  const admin = createAdminClient();

  // 1. Verify project exists
  const { data: projObj } = await admin
    .from("objects")
    .select("id, owner_id, created_by")
    .eq("id", projectId)
    .single();
  if (!projObj) throw new AppError("NOT_FOUND", "Project not found");

  // 2. Find proposal object type
  const { data: proposalType } = await admin
    .from("object_types")
    .select("id")
    .eq("name", "proposal")
    .single();
  if (!proposalType)
    throw new AppError(
      "NOT_FOUND",
      "Proposal object type not configured. Create a 'proposal' object type in the Registry first."
    );

  // 3. Prevent duplicate proposals from the same user
  const { data: existingRels } = await admin
    .from("object_relations")
    .select("from_object_id")
    .eq("to_object_id", projectId)
    .eq("relation_type", "proposal_for");

  if (existingRels && existingRels.length > 0) {
    const existingIds = existingRels.map((r) => r.from_object_id);
    const { data: mine } = await admin
      .from("objects")
      .select("id")
      .in("id", existingIds)
      .or(`owner_id.eq.${ctx.userId},created_by.eq.${ctx.userId}`);
    if (mine && mine.length > 0) {
      throw new AppError("VALIDATION", "You have already submitted a proposal for this project");
    }
  }

  // 4. Required modules for proposal type
  const { data: typeModules } = await admin
    .from("object_type_modules")
    .select("module_id, required, modules(id, name, schema)")
    .eq("object_type_id", proposalType.id);

  // 5. Create proposal object
  const { data: proposal, error: createErr } = await admin
    .from("objects")
    .insert({
      object_type_id: proposalType.id,
      owner_id: ctx.userId,
      created_by: ctx.userId,
    })
    .select()
    .single();
  if (createErr || !proposal)
    throw new AppError("DB_ERROR", createErr?.message ?? "Failed to create proposal");

  // 6. Attach module data
  for (const tm of typeModules ?? []) {
    const mod = (tm as any).modules;
    const moduleName = mod?.name as string;
    const moduleData = proposalModules[moduleName] ?? {};

    await admin.from("object_modules").insert({
      object_id: proposal.id,
      module_id: tm.module_id,
      data: moduleData as unknown as Json,
    });
  }

  // 7. Create relation: proposal → project
  await admin.from("object_relations").insert({
    from_object_id: proposal.id,
    to_object_id: projectId,
    relation_type: "proposal_for",
    metadata: {} as unknown as Json,
  });

  await auditLog(ctx, {
    action: "marketplace:proposal:submit",
    category: "data",
    entityType: "object",
    entityId: proposal.id,
    newValues: { projectId } as Record<string, unknown>,
  });

  return { proposalId: proposal.id };
}

/* ------------------------------------------------------------------ */
/*  Proposal Acceptance  → creates a Deal                             */
/* ------------------------------------------------------------------ */

export async function acceptProposal(
  ctx: AuthContext,
  proposalId: string,
  projectId: string
): Promise<{ dealId: string }> {
  const admin = createAdminClient();

  // 1. Verify ownership
  const { data: project } = await admin
    .from("objects")
    .select("id, owner_id, created_by")
    .eq("id", projectId)
    .single();
  if (!project) throw new AppError("NOT_FOUND", "Project not found");
  if (project.owner_id !== ctx.userId && project.created_by !== ctx.userId)
    throw new AppError("FORBIDDEN", "Only the project owner can accept proposals");

  // 2. Load proposal
  const { data: proposal } = await admin
    .from("objects")
    .select("id, owner_id, created_by")
    .eq("id", proposalId)
    .single();
  if (!proposal) throw new AppError("NOT_FOUND", "Proposal not found");

  // 3. Update proposal status → accepted
  const { data: proposalOMs } = await admin
    .from("object_modules")
    .select("id, module_id, data, modules(name)")
    .eq("object_id", proposalId);

  for (const pm of proposalOMs ?? []) {
    const modName = (pm as any).modules?.name;
    if (modName === "stage" || modName === "proposal_status") {
      const current = (pm.data ?? {}) as Record<string, unknown>;
      await admin
        .from("object_modules")
        .update({ data: { ...current, status: "accepted", stage: "accepted" } as unknown as Json })
        .eq("id", pm.id);
    }
  }

  // 4. Try to create a Deal object
  const { data: dealType } = await admin
    .from("object_types")
    .select("id")
    .eq("name", "deal")
    .single();

  let dealId: string;

  if (dealType) {
    // 4a. Create the deal
    const { data: deal, error: dealErr } = await admin
      .from("objects")
      .insert({ object_type_id: dealType.id, owner_id: ctx.userId, created_by: ctx.userId })
      .select()
      .single();
    if (dealErr || !deal) throw new AppError("DB_ERROR", dealErr?.message ?? "Failed to create deal");
    dealId = deal.id;

    // 4b. Derive a name from the proposal's identity
    const identityOM = (proposalOMs ?? []).find((pm) => (pm as any).modules?.name === "identity");
    const proposalName = identityOM
      ? String((identityOM.data as Record<string, unknown>)?.name ?? "Marketplace Deal")
      : "Marketplace Deal";

    // Attach identity module to deal
    const { data: identityMod } = await admin
      .from("modules")
      .select("id")
      .eq("name", "identity")
      .single();
    if (identityMod) {
      await admin.from("object_modules").insert({
        object_id: deal.id,
        module_id: identityMod.id,
        data: { name: `Deal: ${proposalName}` } as unknown as Json,
      });
    }

    // Attach stage module as "won"
    const { data: stageMod } = await admin.from("modules").select("id").eq("name", "stage").single();
    if (stageMod) {
      await admin.from("object_modules").insert({
        object_id: deal.id,
        module_id: stageMod.id,
        data: { stage: "won", status: "active" } as unknown as Json,
      });
    }

    // Copy monetary module from proposal if present
    const monetaryOM = (proposalOMs ?? []).find((pm) => (pm as any).modules?.name === "monetary");
    if (monetaryOM) {
      const { data: monetaryMod } = await admin.from("modules").select("id").eq("name", "monetary").single();
      if (monetaryMod) {
        await admin.from("object_modules").insert({
          object_id: deal.id,
          module_id: monetaryMod.id,
          data: monetaryOM.data as unknown as Json,
        });
      }
    }

    // 4c. Create relations
    await admin.from("object_relations").insert({
      from_object_id: deal.id,
      to_object_id: projectId,
      relation_type: "deal_from_project",
      metadata: {} as unknown as Json,
    });

    await admin.from("object_relations").insert({
      from_object_id: deal.id,
      to_object_id: proposalId,
      relation_type: "deal_from_proposal",
      metadata: {} as unknown as Json,
    });
  } else {
    // No deal type configured — just mark proposal as accepted
    dealId = proposalId;
  }

  await auditLog(ctx, {
    action: "marketplace:proposal:accept",
    category: "data",
    entityType: "object",
    entityId: proposalId,
    newValues: { projectId, proposalId, dealId } as Record<string, unknown>,
  });

  return { dealId };
}

/* ------------------------------------------------------------------ */
/*  Proposal Rejection                                                */
/* ------------------------------------------------------------------ */

export async function rejectProposal(
  ctx: AuthContext,
  proposalId: string,
  projectId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("objects")
    .select("id, owner_id, created_by")
    .eq("id", projectId)
    .single();
  if (!project) throw new AppError("NOT_FOUND", "Project not found");
  if (project.owner_id !== ctx.userId && project.created_by !== ctx.userId)
    throw new AppError("FORBIDDEN", "Only the project owner can reject proposals");

  const { data: proposalOMs } = await admin
    .from("object_modules")
    .select("id, module_id, data, modules(name)")
    .eq("object_id", proposalId);

  for (const pm of proposalOMs ?? []) {
    const modName = (pm as any).modules?.name;
    if (modName === "stage" || modName === "proposal_status") {
      const current = (pm.data ?? {}) as Record<string, unknown>;
      await admin
        .from("object_modules")
        .update({ data: { ...current, status: "rejected", stage: "rejected" } as unknown as Json })
        .eq("id", pm.id);
    }
  }

  await auditLog(ctx, {
    action: "marketplace:proposal:reject",
    category: "data",
    entityType: "object",
    entityId: proposalId,
    newValues: { projectId, proposalId } as Record<string, unknown>,
  });
}
