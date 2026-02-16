import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, type AuthContext } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { auditLog } from "@/lib/audit/logger";
import { AppError } from "@/lib/utils/errors";
import type { UserWithRoles } from "../types/user.types";

/**
 * List all users with their roles.
 */
export async function getUsers(ctx: AuthContext): Promise<UserWithRoles[]> {
  requirePermission(ctx, Actions.USER_MANAGE);

  const admin = createAdminClient();

  // Fetch profiles
  const { data: profiles, error: profilesErr } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (profilesErr) throw new AppError("DB_ERROR", profilesErr.message);

  // Fetch user_roles with role info
  const { data: userRoles, error: urErr } = await admin
    .from("user_roles")
    .select("user_id, roles:role_id(id, name)");

  if (urErr) throw new AppError("DB_ERROR", urErr.message);

  // Fetch emails from auth.users via admin API
  const { data: authData } = await admin.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  authData?.users?.forEach((u) => {
    if (u.email) emailMap.set(u.id, u.email);
  });

  // Map roles per user
  const roleMap = new Map<string, { id: string; name: string }[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userRoles?.forEach((ur: any) => {
    const userId = ur.user_id;
    const role = ur.roles;
    if (!role) return;
    if (!roleMap.has(userId)) roleMap.set(userId, []);
    roleMap.get(userId)!.push({ id: role.id, name: role.name });
  });

  return (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap.get(p.id),
    roles: roleMap.get(p.id) ?? [],
  }));
}

/**
 * Assign a role to a user.
 */
export async function assignRole(
  ctx: AuthContext,
  userId: string,
  roleId: string
): Promise<void> {
  requirePermission(ctx, Actions.USER_MANAGE);

  const admin = createAdminClient();

  // Verify user and role exist
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("id", userId)
    .single();
  if (!profile) throw new AppError("NOT_FOUND", "User not found");

  const { data: role } = await admin
    .from("roles")
    .select("id, name")
    .eq("id", roleId)
    .single();
  if (!role) throw new AppError("NOT_FOUND", "Role not found");

  // Check if already assigned
  const { data: existing } = await admin
    .from("user_roles")
    .select()
    .eq("user_id", userId)
    .eq("role_id", roleId)
    .maybeSingle();

  if (existing) {
    throw new AppError("VALIDATION", `User already has the "${role.name}" role`);
  }

  const { error } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role_id: roleId });

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "user:role_assign",
    category: "admin",
    entityType: "user_role",
    entityId: userId,
    newValues: { user_id: userId, role_id: roleId, role_name: role.name, user_name: profile.full_name },
  });
}

/**
 * Remove a role from a user.
 */
export async function revokeRole(
  ctx: AuthContext,
  userId: string,
  roleId: string
): Promise<void> {
  requirePermission(ctx, Actions.USER_MANAGE);

  const admin = createAdminClient();

  const { data: role } = await admin
    .from("roles")
    .select("id, name")
    .eq("id", roleId)
    .single();

  const { error } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role_id", roleId);

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "user:role_revoke",
    category: "admin",
    entityType: "user_role",
    entityId: userId,
    oldValues: { user_id: userId, role_id: roleId, role_name: role?.name },
  });
}

/**
 * Update a user's profile (admin action).
 */
export async function updateUserProfile(
  ctx: AuthContext,
  userId: string,
  data: { full_name?: string }
): Promise<void> {
  requirePermission(ctx, Actions.USER_MANAGE);

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select()
    .eq("id", userId)
    .single();
  if (!existing) throw new AppError("NOT_FOUND", "User not found");

  const { error } = await admin
    .from("profiles")
    .update(data)
    .eq("id", userId);

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "profile:update",
    category: "admin",
    entityType: "profile",
    entityId: userId,
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: data,
  });
}
