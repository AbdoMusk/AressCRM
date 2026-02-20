"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as roleService from "../services/role.service";

export async function getRolesAction(): Promise<ActionResult<Awaited<ReturnType<typeof roleService.getRoles>>>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Unauthorized" };
    const data = await roleService.getRoles(ctx);
    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load roles" };
  }
}

export async function getAllPermissionsAction(): Promise<ActionResult<Awaited<ReturnType<typeof roleService.getAllPermissions>>>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Unauthorized" };
    const data = await roleService.getAllPermissions(ctx);
    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load permissions" };
  }
}

export async function createRoleAction(
  name: string,
  description: string | null,
  permissionIds: string[]
): Promise<ActionResult<void>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Unauthorized" };

    await roleService.createRole(ctx, name, description, permissionIds);
    revalidatePath("/settings/roles");
    revalidatePath("/settings/users");
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create role" };
  }
}

export async function updateRoleAction(
  roleId: string,
  data: { name?: string; description?: string | null }
): Promise<ActionResult<void>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Unauthorized" };

    await roleService.updateRole(ctx, roleId, data);
    revalidatePath("/settings/roles");
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update role" };
  }
}

export async function updateRolePermissionsAction(
  roleId: string,
  permissionIds: string[]
): Promise<ActionResult<void>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Unauthorized" };

    await roleService.updateRolePermissions(ctx, roleId, permissionIds);
    revalidatePath("/settings/roles");
    revalidatePath("/settings/users");
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update permissions" };
  }
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult<void>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Unauthorized" };

    await roleService.deleteRole(ctx, roleId);
    revalidatePath("/settings/roles");
    revalidatePath("/settings/users");
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete role" };
  }
}
