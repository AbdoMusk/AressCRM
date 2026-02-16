import type { Database } from "@/lib/supabase/database.types";

export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Omit<
  Database["public"]["Tables"]["leads"]["Insert"],
  "id" | "created_by"
>;
export type LeadUpdate = Partial<
  Omit<
    Database["public"]["Tables"]["leads"]["Insert"],
    "id" | "created_by"
  >
>;

/** Lead row joined with profile names and status/source/company details */
export interface LeadWithRelations extends LeadRow {
  assigned_to_profile: { full_name: string } | null;
  created_by_profile: { full_name: string } | null;
  lead_statuses: { name: string; slug: string; color: string } | null;
  lead_sources: { name: string; slug: string } | null;
  companies: { id: string; name: string } | null;
}
