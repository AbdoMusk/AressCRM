import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Action } from "./actions";

export interface ModulePermission {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface AuthContext {
  userId: string;
  email?: string;
  permissions: Set<string>;
  /** Module-level permissions keyed by "moduleId:objectTypeId" or "all:all" */
  modulePermissions: Map<string, ModulePermission>;
}

/**
 * Loads the authenticated user's permissions from the database.
 * Includes both action-level and module-level permissions.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Load action-level permissions
  const { data: perms } = await supabase
    .from("user_roles")
    .select(
      "roles:role_id ( role_permissions ( permissions:permission_id ( action ) ) )"
    )
    .eq("user_id", user.id);

  const permissions = new Set<string>();
  perms?.forEach((ur: any) => {
    ur.roles?.role_permissions?.forEach((rp: any) => {
      if (rp.permissions?.action) permissions.add(rp.permissions.action);
    });
  });

  // Load module-level permissions
  const { data: roleIds } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", user.id);

  const modulePermissions = new Map<string, ModulePermission>();

  if (roleIds && roleIds.length > 0) {
    const ids = roleIds.map((r) => r.role_id);
    const { data: modPerms } = await supabase
      .from("role_module_permissions")
      .select("module_id, object_type_id, can_read, can_write, can_delete")
      .in("role_id", ids);

    modPerms?.forEach((mp) => {
      const modKey = mp.module_id ?? "all";
      const typeKey = mp.object_type_id ?? "all";
      const key = `${modKey}:${typeKey}`;
      const existing = modulePermissions.get(key);
      // Merge permissions (OR) across roles
      modulePermissions.set(key, {
        canRead: (existing?.canRead ?? false) || mp.can_read,
        canWrite: (existing?.canWrite ?? false) || mp.can_write,
        canDelete: (existing?.canDelete ?? false) || mp.can_delete,
      });
    });
  }

  return { userId: user.id, email: user.email, permissions, modulePermissions };
}

/**
 * Checks if the auth context has a specific permission.
 */
export function hasPermission(ctx: AuthContext, action: Action): boolean {
  return ctx.permissions.has(action);
}

/**
 * Throws if permission is missing. Used as a guard at the top of service methods.
 */
export function requirePermission(ctx: AuthContext, action: Action): void {
  if (!hasPermission(ctx, action)) {
    throw new AppError("FORBIDDEN", `Missing permission: ${action}`);
  }
}

/**
 * Gets the effective module permission for a specific module and object type.
 * Checks specific → wildcard module → wildcard type → full wildcard.
 */
export function getModulePermission(
  ctx: AuthContext,
  moduleId: string | null,
  objectTypeId: string | null
): ModulePermission {
  const checks = [
    `${moduleId}:${objectTypeId}`, // exact match
    `${moduleId}:all`, // any object type
    `all:${objectTypeId}`, // any module for this type
    "all:all", // full wildcard
  ];

  for (const key of checks) {
    const perm = ctx.modulePermissions.get(key);
    if (perm) return perm;
  }

  return { canRead: false, canWrite: false, canDelete: false };
}

/**
 * Throws if the user lacks the specified module access.
 */
export function requireModuleAccess(
  ctx: AuthContext,
  moduleId: string | null,
  objectTypeId: string | null,
  access: "read" | "write" | "delete"
): void {
  const perm = getModulePermission(ctx, moduleId, objectTypeId);
  const allowed =
    access === "read"
      ? perm.canRead
      : access === "write"
        ? perm.canWrite
        : perm.canDelete;

  if (!allowed) {
    throw new AppError(
      "FORBIDDEN",
      `Missing ${access} access for module ${moduleId}`
    );
  }
}
