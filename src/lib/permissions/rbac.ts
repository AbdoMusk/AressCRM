import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Action } from "./actions";

export interface AuthContext {
  userId: string;
  permissions: Set<string>;
}

/**
 * Loads the authenticated user's permissions from the database.
 * Designed to be called once per request and passed through the call chain.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Single query joining user_roles → role_permissions → permissions
  const { data: perms } = await supabase
    .from("user_roles")
    .select(
      "roles:role_id ( role_permissions ( permissions:permission_id ( action ) ) )"
    )
    .eq("user_id", user.id);

  const permissions = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  perms?.forEach((ur: any) => {
    ur.roles?.role_permissions?.forEach((rp: any) => {
      if (rp.permissions?.action) permissions.add(rp.permissions.action);
    });
  });

  return { userId: user.id, permissions };
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
