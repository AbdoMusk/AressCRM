"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as userService from "../services/user.service";

export async function getUsersAction() {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");
  return userService.getUsers(ctx);
}

export async function assignRoleAction(userId: string, roleId: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await userService.assignRole(ctx, userId, roleId);
  revalidatePath("/settings/users");
}

export async function revokeRoleAction(userId: string, roleId: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await userService.revokeRole(ctx, userId, roleId);
  revalidatePath("/settings/users");
}

export async function updateUserProfileAction(
  userId: string,
  data: { full_name?: string }
) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await userService.updateUserProfile(ctx, userId, data);
  revalidatePath("/settings/users");
}
