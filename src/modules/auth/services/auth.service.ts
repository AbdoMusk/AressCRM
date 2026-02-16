import { createClient } from "@/lib/supabase/server";
import { auditLogSystem } from "@/lib/audit/logger";
import { AuditActions } from "@/lib/permissions/actions";

/**
 * Sign in with email + password.
 * Returns the session data or throws.
 */
export async function signInWithEmail(email: string, password: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    await auditLogSystem({
      action: AuditActions.AUTH_LOGIN_FAILED,
      category: "auth",
      metadata: { email, reason: error.message },
    });
    throw error;
  }

  await auditLogSystem({
    userId: data.user.id,
    action: AuditActions.AUTH_LOGIN,
    category: "auth",
    newValues: { method: "email" },
  });

  return data;
}

/**
 * Sign up with email + password + full name.
 * Creates the auth user; the DB trigger auto-creates the profile.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) throw error;

  if (data.user) {
    await auditLogSystem({
      userId: data.user.id,
      action: AuditActions.AUTH_SIGNUP,
      category: "auth",
      entityType: "profile",
      newValues: { email, full_name: fullName },
    });
  }

  return data;
}

/**
 * Sign out the current user.
 */
export async function signOut(userId?: string) {
  const supabase = await createClient();

  if (userId) {
    await auditLogSystem({
      userId,
      action: AuditActions.AUTH_LOGOUT,
      category: "auth",
    });
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
