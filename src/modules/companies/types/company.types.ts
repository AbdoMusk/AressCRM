import type { Database } from "@/lib/supabase/database.types";

export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Omit<
  Database["public"]["Tables"]["companies"]["Insert"],
  "id" | "created_by"
>;
export type CompanyUpdate = Partial<
  Omit<
    Database["public"]["Tables"]["companies"]["Insert"],
    "id" | "created_by"
  >
>;

export type CompanyMemberRow = Database["public"]["Tables"]["company_members"]["Row"];

/** Company row joined with profile names */
export interface CompanyWithRelations extends CompanyRow {
  assigned_to_profile: { full_name: string } | null;
  created_by_profile: { full_name: string } | null;
  lead_count?: number;
}

/** Small shape for select/autocomplete dropdowns */
export interface CompanyOption {
  id: string;
  name: string;
}

/** Company member with profile info */
export interface CompanyMemberWithProfile extends CompanyMemberRow {
  profiles: { full_name: string } | null;
}
