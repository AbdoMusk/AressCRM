"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as roleService from "../services/role.service";

export async function getRolesAction() {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");
  return roleService.getRoles(ctx);
}

export async function getAllPermissionsAction() {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");
  return roleService.getAllPermissions(ctx);
}

export async function createRoleAction(
  name: string,
  description: string | null,
  permissionIds: string[]
) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await roleService.createRole(ctx, name, description, permissionIds);
  revalidatePath("/settings/roles");
  revalidatePath("/settings/users");
}

export async function updateRoleAction(
  roleId: string,
  data: { name?: string; description?: string | null }
) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await roleService.updateRole(ctx, roleId, data);
  revalidatePath("/settings/roles");
}

export async function updateRolePermissionsAction(
  roleId: string,
  permissionIds: string[]
) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await roleService.updateRolePermissions(ctx, roleId, permissionIds);
  revalidatePath("/settings/roles");
  revalidatePath("/settings/users");
}

export async function deleteRoleAction(roleId: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await roleService.deleteRole(ctx, roleId);
  revalidatePath("/settings/roles");
  revalidatePath("/settings/users");
}
