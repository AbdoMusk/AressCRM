import type { Database } from "@/lib/supabase/database.types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface UserWithRoles extends ProfileRow {
  email?: string;
  roles: { id: string; name: string }[];
}

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface PermissionRow {
  id: string;
  action: string;
  description: string | null;
}

export interface RoleWithPermissions extends RoleRow {
  permissions: PermissionRow[];
}
