/**
 * OMP Engine — Object Service
 *
 * Core CRUD operations for objects and their modules.
 * The heart of the OMP engine.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/permissions/rbac";
import {
  hasPermission,
  requireModuleAccess,
  getModulePermission,
} from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { AppError } from "@/lib/utils/errors";
import { auditLog } from "@/lib/audit/logger";
import type { Json } from "@/lib/supabase/database.types";
import type {
  ObjectWithModules,
  ObjectCreateInput,
  ObjectQueryParams,
  ObjectFilter,
} from "../types/object.types";
import type { AttachedModule, ModuleSchema } from "../types/module.types";
import { parseModuleSchema } from "../types/module.types";
import { validateModuleData, applyDefaults } from "../schemas/dynamic-validator";
import { trackStatusChange } from "./timeline.service";

// ── Helpers ──────────────────────────────────

function buildDisplayName(modules: AttachedModule[]): string {
  // Try identity module first
  const identity = modules.find((c) => c.moduleName === "identity");
  if (identity?.data?.name) return String(identity.data.name);

  // Try organization module
  const org = modules.find((c) => c.moduleName === "organization");
  if (org?.data?.company_name) return String(org.data.company_name);

  // Fallback to first module with a name-like field
  for (const c of modules) {
    if (c.data?.name) return String(c.data.name);
    if (c.data?.title) return String(c.data.title);
  }

  return "Unnamed Object";
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

// ── Service Methods ──────────────────────────

/**
 * List objects with optional filtering by type and module data.
 */
export async function getObjects(
  ctx: AuthContext,
  params: ObjectQueryParams = {}
): Promise<{ objects: ObjectWithModules[]; total: number }> {
  const canReadAll = hasPermission(ctx, Actions.OBJECT_READ);
  const canReadOwn = hasPermission(ctx, Actions.OBJECT_READ_OWN);

  if (!canReadAll && !canReadOwn) {
    throw new AppError("FORBIDDEN", "No read access");
  }

  const admin = createAdminClient();
  const limit = params.limit ?? 50;
  const offset = ((params.page ?? 1) - 1) * limit;

  // Load all module definitions for schema resolution
  const { data: allModules } = await admin.from("modules").select("*");
  const moduleDefs = new Map(
    (allModules ?? []).map((c) => [c.id, c])
  );

  // Build base query
  let query = admin.from("objects").select("*, object_types(*)", { count: "exact" });

  // Filter by object type
  if (params.objectType) {
    const { data: typeRow } = await admin
      .from("object_types")
      .select("id")
      .eq("name", params.objectType)
      .single();

    if (typeRow) {
      query = query.eq("object_type_id", typeRow.id);
    }
  }

  // Ownership filter for own-only permission
  if (!canReadAll && canReadOwn) {
    query = query.or(`owner_id.eq.${ctx.userId},created_by.eq.${ctx.userId}`);
  }

  // Apply module data filters
  if (params.filters && params.filters.length > 0) {
    const objectIds = await filterByModuleData(admin, params.filters, moduleDefs);
    if (objectIds.length === 0) {
      return { objects: [], total: 0 };
    }
    query = query.in("id", objectIds);
  }

  // Apply text search across module data
  if (params.search && params.search.trim().length > 0) {
    const searchIds = await searchByModuleData(admin, params.search.trim());
    if (searchIds.length === 0) {
      return { objects: [], total: 0 };
    }
    query = query.in("id", searchIds);
  }

  // Sort and paginate
  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data: objects, error, count } = await query;

  if (error) throw new AppError("DB_ERROR", error.message);

  // Load all object_modules for returned objects
  const objectIds = (objects ?? []).map((e) => e.id);
  const { data: objModules } = await admin
    .from("object_modules")
    .select("*")
    .in("object_id", objectIds);

  // Build result
  const result: ObjectWithModules[] = (objects ?? []).map((obj) => {
    const oModules = (objModules ?? []).filter((om) => om.object_id === obj.id);
    const attachedModules = buildAttachedModules(oModules, moduleDefs);

    // Filter modules by permission
    const visibleModules = attachedModules.filter((m) => {
      const perm = getModulePermission(ctx, m.moduleId, obj.object_type_id);
      return perm.canRead;
    });

    return {
      ...obj,
      object_type: (obj as any).object_types,
      modules: visibleModules,
      displayName: buildDisplayName(visibleModules),
    };
  });

  return { objects: result, total: count ?? 0 };
}

/**
 * Get a single object with all its modules and relations.
 */
export async function getObject(
  ctx: AuthContext,
  objectId: string
): Promise<ObjectWithModules> {
  const canReadAll = hasPermission(ctx, Actions.OBJECT_READ);
  const canReadOwn = hasPermission(ctx, Actions.OBJECT_READ_OWN);

  if (!canReadAll && !canReadOwn) {
    throw new AppError("FORBIDDEN", "No read access");
  }

  const admin = createAdminClient();

  const { data: obj, error } = await admin
    .from("objects")
    .select("*, object_types(*)")
    .eq("id", objectId)
    .single();

  if (error || !obj) throw new AppError("NOT_FOUND", "Object not found");

  // Ownership check for own-only
  if (!canReadAll && canReadOwn) {
    if (obj.owner_id !== ctx.userId && obj.created_by !== ctx.userId) {
      throw new AppError("FORBIDDEN", "Not your object");
    }
  }

  // Load module definitions
  const { data: allModules } = await admin.from("modules").select("*");
  const moduleDefs = new Map(
    (allModules ?? []).map((c) => [c.id, c])
  );

  // Load object modules
  const { data: objModules } = await admin
    .from("object_modules")
    .select("*")
    .eq("object_id", objectId);

  const attachedModules = buildAttachedModules(objModules ?? [], moduleDefs);

  // Filter by module permissions
  const visibleModules = attachedModules.filter((m) => {
    const perm = getModulePermission(ctx, m.moduleId, obj.object_type_id);
    return perm.canRead;
  });

  return {
    ...obj,
    object_type: (obj as any).object_types,
    modules: visibleModules,
    displayName: buildDisplayName(visibleModules),
  };
}

/**
 * Create a new object with its modules.
 */
export async function createObject(
  ctx: AuthContext,
  input: ObjectCreateInput
): Promise<ObjectWithModules> {
  if (!hasPermission(ctx, Actions.OBJECT_CREATE)) {
    throw new AppError("FORBIDDEN", "Cannot create objects");
  }

  const admin = createAdminClient();

  // Load object type with required modules
  const { data: objectType } = await admin
    .from("object_types")
    .select("*")
    .eq("id", input.objectTypeId)
    .single();

  if (!objectType) throw new AppError("NOT_FOUND", "Object type not found");

  const { data: typeModules } = await admin
    .from("object_type_modules")
    .select("*, modules(*)")
    .eq("object_type_id", input.objectTypeId)
    .order("position");

  // Validate required modules are provided
  for (const tm of typeModules ?? []) {
    const mod = (tm as any).modules;
    if (tm.required && !input.modules[mod.name]) {
      throw new AppError(
        "VALIDATION",
        `Required module '${mod.display_name}' is missing`
      );
    }
  }

  // Validate module data against schemas
  for (const tm of typeModules ?? []) {
    const mod = (tm as any).modules;
    const data = input.modules[mod.name];
    if (!data) continue;

    const schema = parseModuleSchema(mod.schema);
    const withDefaults = applyDefaults(schema, data);
    const validation = validateModuleData(schema, withDefaults);

    if (!validation.success) {
      throw new AppError(
        "VALIDATION",
        `Module '${mod.display_name}': ${validation.errors.join(", ")}`
      );
    }

    // Check write permission
    requireModuleAccess(ctx, tm.module_id, input.objectTypeId, "write");
  }

  // Create object
  const { data: obj, error: objError } = await admin
    .from("objects")
    .insert({
      object_type_id: input.objectTypeId,
      owner_id: input.ownerId ?? ctx.userId,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (objError) throw new AppError("DB_ERROR", objError.message);

  // Insert module data
  const moduleInserts = [];
  for (const tm of typeModules ?? []) {
    const mod = (tm as any).modules;
    const data = input.modules[mod.name];
    if (!data) continue;

    const schema = parseModuleSchema(mod.schema);
    const withDefaults = applyDefaults(schema, data);

    moduleInserts.push({
      object_id: obj.id,
      module_id: tm.module_id,
      data: withDefaults as unknown as Json,
    });
  }

  if (moduleInserts.length > 0) {
    const { error: modError } = await admin
      .from("object_modules")
      .insert(moduleInserts);

    if (modError) throw new AppError("DB_ERROR", modError.message);
  }

  await auditLog(ctx, {
    action: "object:create",
    category: "data",
    entityType: objectType.name,
    entityId: obj.id,
    newValues: {
      object_type: objectType.name,
      modules: input.modules,
    },
  });

  return getObject(ctx, obj.id);
}

/**
 * Update a specific module's data on an object.
 */
export async function updateObjectModule(
  ctx: AuthContext,
  objectId: string,
  moduleId: string,
  data: Record<string, unknown>
): Promise<ObjectWithModules> {
  const canUpdateAll = hasPermission(ctx, Actions.OBJECT_UPDATE);
  const canUpdateOwn = hasPermission(ctx, Actions.OBJECT_UPDATE_OWN);

  if (!canUpdateAll && !canUpdateOwn) {
    throw new AppError("FORBIDDEN", "No update access");
  }

  const admin = createAdminClient();

  // Check object exists and ownership
  const { data: obj } = await admin
    .from("objects")
    .select("*, object_types(*)")
    .eq("id", objectId)
    .single();

  if (!obj) throw new AppError("NOT_FOUND", "Object not found");

  if (!canUpdateAll && canUpdateOwn) {
    if (obj.owner_id !== ctx.userId && obj.created_by !== ctx.userId) {
      throw new AppError("FORBIDDEN", "Not your object");
    }
  }

  // Check module write permission
  requireModuleAccess(ctx, moduleId, obj.object_type_id, "write");

  // Load module definition and validate data
  const { data: mod } = await admin
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  if (!mod) throw new AppError("NOT_FOUND", "Module not found");

  const schema = parseModuleSchema(mod.schema);
  const withDefaults = applyDefaults(schema, data);
  const validation = validateModuleData(schema, withDefaults);

  if (!validation.success) {
    throw new AppError(
      "VALIDATION",
      `Validation failed: ${validation.errors.join(", ")}`
    );
  }

  // Get old data for audit
  const { data: oldOm } = await admin
    .from("object_modules")
    .select("data")
    .eq("object_id", objectId)
    .eq("module_id", moduleId)
    .single();

  // Upsert module data
  const { error } = await admin
    .from("object_modules")
    .upsert(
      {
        object_id: objectId,
        module_id: moduleId,
        data: withDefaults as unknown as Json,
      },
      { onConflict: "object_id,module_id" }
    );

  if (error) throw new AppError("DB_ERROR", error.message);

  const objectTypeName = (obj as any).object_types?.name ?? "unknown";

  await auditLog(ctx, {
    action: "object:update_module",
    category: "data",
    entityType: objectTypeName,
    entityId: objectId,
    oldValues: oldOm?.data as Record<string, unknown> | undefined,
    newValues: withDefaults,
    metadata: { moduleName: mod.name },
  });

  // Track status changes in timeline (stage module)
  if (mod.name === "stage") {
    const oldStatus = (oldOm?.data as Record<string, unknown>)?.status as string | undefined;
    const newStatus = withDefaults.status as string | undefined;
    if (oldStatus !== newStatus && newStatus) {
      try {
        await trackStatusChange(
          ctx,
          objectId,
          oldStatus ?? "none",
          newStatus
        );
      } catch {
        // non-critical — don't block the update
      }
    }
  }

  return getObject(ctx, objectId);
}

/**
 * Delete an object and all its modules (cascades).
 */
export async function deleteObject(
  ctx: AuthContext,
  objectId: string
): Promise<void> {
  const canDeleteAll = hasPermission(ctx, Actions.OBJECT_DELETE);
  const canDeleteOwn = hasPermission(ctx, Actions.OBJECT_DELETE_OWN);

  if (!canDeleteAll && !canDeleteOwn) {
    throw new AppError("FORBIDDEN", "No delete access");
  }

  const admin = createAdminClient();

  const { data: obj } = await admin
    .from("objects")
    .select("*, object_types(*)")
    .eq("id", objectId)
    .single();

  if (!obj) throw new AppError("NOT_FOUND", "Object not found");

  if (!canDeleteAll && canDeleteOwn) {
    if (obj.owner_id !== ctx.userId && obj.created_by !== ctx.userId) {
      throw new AppError("FORBIDDEN", "Not your object");
    }
  }

  const { error } = await admin.from("objects").delete().eq("id", objectId);

  if (error) throw new AppError("DB_ERROR", error.message);

  const objectTypeName = (obj as any).object_types?.name ?? "unknown";

  await auditLog(ctx, {
    action: "object:delete",
    category: "data",
    entityType: objectTypeName,
    entityId: objectId,
    oldValues: obj as unknown as Record<string, unknown>,
  });
}

/**
 * Attach a new module to an existing object.
 */
export async function attachModule(
  ctx: AuthContext,
  objectId: string,
  moduleId: string,
  data: Record<string, unknown>
): Promise<ObjectWithModules> {
  const canUpdateAll = hasPermission(ctx, Actions.OBJECT_UPDATE);
  const canUpdateOwn = hasPermission(ctx, Actions.OBJECT_UPDATE_OWN);

  if (!canUpdateAll && !canUpdateOwn) {
    throw new AppError("FORBIDDEN", "No update access");
  }

  const admin = createAdminClient();

  const { data: obj } = await admin
    .from("objects")
    .select("*")
    .eq("id", objectId)
    .single();

  if (!obj) throw new AppError("NOT_FOUND", "Object not found");

  if (!canUpdateAll && canUpdateOwn) {
    if (obj.owner_id !== ctx.userId && obj.created_by !== ctx.userId) {
      throw new AppError("FORBIDDEN", "Not your object");
    }
  }

  requireModuleAccess(ctx, moduleId, obj.object_type_id, "write");

  // Validate data against module schema
  const { data: mod } = await admin
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  if (!mod) throw new AppError("NOT_FOUND", "Module not found");

  const schema = parseModuleSchema(mod.schema);
  const withDefaults = applyDefaults(schema, data);
  const validation = validateModuleData(schema, withDefaults);

  if (!validation.success) {
    throw new AppError(
      "VALIDATION",
      `Validation failed: ${validation.errors.join(", ")}`
    );
  }

  const { error } = await admin.from("object_modules").insert({
    object_id: objectId,
    module_id: moduleId,
    data: withDefaults as unknown as Json,
  });

  if (error) {
    if (error.code === "23505") {
      throw new AppError("VALIDATION", "Module already attached to this object");
    }
    throw new AppError("DB_ERROR", error.message);
  }

  await auditLog(ctx, {
    action: "object:attach_module",
    category: "data",
    entityType: "object",
    entityId: objectId,
    newValues: { moduleName: mod.name, data: withDefaults },
  });

  return getObject(ctx, objectId);
}

/**
 * Remove a module from an object.
 */
export async function detachModule(
  ctx: AuthContext,
  objectId: string,
  moduleId: string
): Promise<ObjectWithModules> {
  const canUpdateAll = hasPermission(ctx, Actions.OBJECT_UPDATE);
  const canUpdateOwn = hasPermission(ctx, Actions.OBJECT_UPDATE_OWN);

  if (!canUpdateAll && !canUpdateOwn) {
    throw new AppError("FORBIDDEN", "No update access");
  }

  const admin = createAdminClient();

  const { data: obj } = await admin
    .from("objects")
    .select("*")
    .eq("id", objectId)
    .single();

  if (!obj) throw new AppError("NOT_FOUND", "Object not found");

  if (!canUpdateAll && canUpdateOwn) {
    if (obj.owner_id !== ctx.userId && obj.created_by !== ctx.userId) {
      throw new AppError("FORBIDDEN", "Not your object");
    }
  }

  // Check if this module is required for the object type
  const { data: typeMod } = await admin
    .from("object_type_modules")
    .select("required")
    .eq("object_type_id", obj.object_type_id)
    .eq("module_id", moduleId)
    .single();

  if (typeMod?.required) {
    throw new AppError("VALIDATION", "Cannot remove a required module");
  }

  requireModuleAccess(ctx, moduleId, obj.object_type_id, "delete");

  const { error } = await admin
    .from("object_modules")
    .delete()
    .eq("object_id", objectId)
    .eq("module_id", moduleId);

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "object:detach_module",
    category: "data",
    entityType: "object",
    entityId: objectId,
    metadata: { moduleId },
  });

  return getObject(ctx, objectId);
}

// ── Internal Filter Helper ───────────────────

async function filterByModuleData(
  admin: ReturnType<typeof createAdminClient>,
  filters: ObjectFilter[],
  moduleDefs: Map<string, any>
): Promise<string[]> {
  // Find module IDs by name
  const moduleByName = new Map<string, string>();
  for (const [id, def] of moduleDefs) {
    moduleByName.set(def.name, id);
  }

  // Start with all object IDs and intersect
  let resultIds: Set<string> | null = null;

  for (const filter of filters) {
    const moduleId = moduleByName.get(filter.moduleName);
    if (!moduleId) continue;

    // Build JSONB filter query
    let query = admin
      .from("object_modules")
      .select("object_id")
      .eq("module_id", moduleId);

    // Apply JSONB operator based on filter operator
    switch (filter.operator) {
      case "eq":
        query = query.eq(`data->${filter.fieldKey}` as any, filter.value);
        break;
      case "neq":
        query = query.neq(`data->${filter.fieldKey}` as any, filter.value);
        break;
      case "gt":
        query = query.gt(`data->${filter.fieldKey}` as any, filter.value);
        break;
      case "lt":
        query = query.lt(`data->${filter.fieldKey}` as any, filter.value);
        break;
      case "gte":
        query = query.gte(`data->${filter.fieldKey}` as any, filter.value);
        break;
      case "lte":
        query = query.lte(`data->${filter.fieldKey}` as any, filter.value);
        break;
      case "contains":
        query = query.ilike(`data->>${filter.fieldKey}` as any, `%${filter.value}%`);
        break;
      case "starts_with":
        query = query.ilike(`data->>${filter.fieldKey}` as any, `${filter.value}%`);
        break;
    }

    const { data } = await query;
    const ids = new Set<string>((data ?? []).map((r: any) => r.object_id as string));

    if (resultIds === null) {
      resultIds = ids;
    } else {
      // Intersect
      const prev = resultIds;
      resultIds = new Set<string>();
      for (const id of prev) {
        if (ids.has(id)) resultIds.add(id);
      }
    }
  }

  return resultIds ? [...resultIds] : [];
}

/**
 * Search objects by text across all module data fields (name, title, email, company_name, etc.)
 */
async function searchByModuleData(
  admin: ReturnType<typeof createAdminClient>,
  searchTerm: string
): Promise<string[]> {
  // Use JSONB text search: cast data to text and do ilike
  const { data } = await admin
    .from("object_modules")
    .select("object_id")
    .or(
      [
        `data->>name.ilike.%${searchTerm}%`,
        `data->>first_name.ilike.%${searchTerm}%`,
        `data->>last_name.ilike.%${searchTerm}%`,
        `data->>email.ilike.%${searchTerm}%`,
        `data->>title.ilike.%${searchTerm}%`,
        `data->>company_name.ilike.%${searchTerm}%`,
        `data->>phone.ilike.%${searchTerm}%`,
      ].join(",")
    );

  const ids = new Set<string>((data ?? []).map((r: any) => r.object_id as string));
  return [...ids];
}
