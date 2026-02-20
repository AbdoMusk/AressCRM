"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as userService from "../services/user.service";

export async function getUsersAction(): Promise<ActionResult<Awaited<ReturnType<typeof userService.getUsers>>>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Unauthorized" };
    const data = await userService.getUsers(ctx);
    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load users" };
  }
}

export async function assignRoleAction(userId: string, roleId: string): Promise<ActionResult<void>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Unauthorized" };

    await userService.assignRole(ctx, userId, roleId);
    revalidatePath("/settings/users");
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to assign role" };
  }
}

export async function revokeRoleAction(userId: string, roleId: string): Promise<ActionResult<void>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Unauthorized" };

    await userService.revokeRole(ctx, userId, roleId);
    revalidatePath("/settings/users");
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to revoke role" };
  }
}

export async function updateUserProfileAction(
  userId: string,
  data: { full_name?: string }
): Promise<ActionResult<void>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: "Unauthorized" };

    await userService.updateUserProfile(ctx, userId, data);
    revalidatePath("/settings/users");
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update profile" };
  }
}
