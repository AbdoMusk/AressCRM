import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission, type AuthContext } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { auditLog } from "@/lib/audit/logger";
import { AppError } from "@/lib/utils/errors";
import type { RoleWithPermissions, PermissionRow } from "@/modules/users/types/user.types";

/**
 * List all roles with their permissions.
 */
export async function getRoles(ctx: AuthContext): Promise<RoleWithPermissions[]> {
  requirePermission(ctx, Actions.ROLE_MANAGE);

  const admin = createAdminClient();

  const { data: roles, error: rolesErr } = await admin
    .from("roles")
    .select("*")
    .order("name");

  if (rolesErr) throw new AppError("DB_ERROR", rolesErr.message);

  // Fetch role_permissions with permission details
  const { data: rp, error: rpErr } = await admin
    .from("role_permissions")
    .select("role_id, permissions:permission_id(id, action, description)");

  if (rpErr) throw new AppError("DB_ERROR", rpErr.message);

  // Build permissions map per role
  const permMap = new Map<string, PermissionRow[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rp?.forEach((entry: any) => {
    const roleId = entry.role_id;
    const perm = entry.permissions;
    if (!perm) return;
    if (!permMap.has(roleId)) permMap.set(roleId, []);
    permMap.get(roleId)!.push(perm);
  });

  return (roles ?? []).map((r) => ({
    ...r,
    permissions: permMap.get(r.id) ?? [],
  }));
}

/**
 * Get all available permissions.
 */
export async function getAllPermissions(ctx: AuthContext): Promise<PermissionRow[]> {
  requirePermission(ctx, Actions.ROLE_MANAGE);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("permissions")
    .select("*")
    .order("action");

  if (error) throw new AppError("DB_ERROR", error.message);
  return data ?? [];
}

/**
 * Create a new role.
 */
export async function createRole(
  ctx: AuthContext,
  name: string,
  description: string | null,
  permissionIds: string[]
): Promise<void> {
  requirePermission(ctx, Actions.ROLE_MANAGE);

  const admin = createAdminClient();

  // Check name uniqueness
  const { data: existing } = await admin
    .from("roles")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    throw new AppError("VALIDATION", `Role "${name}" already exists`);
  }

  const { data: role, error: roleErr } = await admin
    .from("roles")
    .insert({ name, description })
    .select()
    .single();

  if (roleErr) throw new AppError("DB_ERROR", roleErr.message);

  // Assign permissions
  if (permissionIds.length > 0) {
    const { error: rpErr } = await admin
      .from("role_permissions")
      .insert(permissionIds.map((pid) => ({ role_id: role.id, permission_id: pid })));

    if (rpErr) throw new AppError("DB_ERROR", rpErr.message);
  }

  await auditLog(ctx, {
    action: "role:create",
    category: "admin",
    entityType: "role",
    entityId: role.id,
    newValues: { name, description, permissions: permissionIds },
  });
}

/**
 * Update a role's permissions.
 */
export async function updateRolePermissions(
  ctx: AuthContext,
  roleId: string,
  permissionIds: string[]
): Promise<void> {
  requirePermission(ctx, Actions.ROLE_MANAGE);

  const admin = createAdminClient();

  // Get current permissions for audit
  const { data: oldPerms } = await admin
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", roleId);

  // Delete all current permissions and re-insert
  await admin.from("role_permissions").delete().eq("role_id", roleId);

  if (permissionIds.length > 0) {
    const { error } = await admin
      .from("role_permissions")
      .insert(permissionIds.map((pid) => ({ role_id: roleId, permission_id: pid })));

    if (error) throw new AppError("DB_ERROR", error.message);
  }

  await auditLog(ctx, {
    action: "role:update",
    category: "admin",
    entityType: "role",
    entityId: roleId,
    oldValues: { permissions: oldPerms?.map((p) => p.permission_id) },
    newValues: { permissions: permissionIds },
  });
}

/**
 * Update a role's name/description.
 */
export async function updateRole(
  ctx: AuthContext,
  roleId: string,
  data: { name?: string; description?: string | null }
): Promise<void> {
  requirePermission(ctx, Actions.ROLE_MANAGE);

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("roles")
    .select()
    .eq("id", roleId)
    .single();
  if (!existing) throw new AppError("NOT_FOUND", "Role not found");

  const { error } = await admin
    .from("roles")
    .update(data)
    .eq("id", roleId);

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "role:update",
    category: "admin",
    entityType: "role",
    entityId: roleId,
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: data,
  });
}

/**
 * Delete a role (only if no users are assigned to it).
 */
export async function deleteRole(
  ctx: AuthContext,
  roleId: string
): Promise<void> {
  requirePermission(ctx, Actions.ROLE_MANAGE);

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("roles")
    .select()
    .eq("id", roleId)
    .single();
  if (!existing) throw new AppError("NOT_FOUND", "Role not found");

  // Check if any users have this role
  const { count } = await admin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role_id", roleId);

  if (count && count > 0) {
    throw new AppError(
      "VALIDATION",
      `Cannot delete role "${existing.name}" — it is assigned to ${count} user(s). Remove them first.`
    );
  }

  // Delete role_permissions first, then role
  await admin.from("role_permissions").delete().eq("role_id", roleId);
  const { error } = await admin.from("roles").delete().eq("id", roleId);
  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "role:delete",
    category: "admin",
    entityType: "role",
    entityId: roleId,
    oldValues: existing as unknown as Record<string, unknown>,
  });
}
