import type { Database } from "@/lib/supabase/database.types";

export type LeadStatusRow = Database["public"]["Tables"]["lead_statuses"]["Row"];
export type LeadStatusInsert = Omit<
  Database["public"]["Tables"]["lead_statuses"]["Insert"],
  "id"
>;
export type LeadStatusUpdate = Partial<LeadStatusInsert>;

export type LeadSourceRow = Database["public"]["Tables"]["lead_sources"]["Row"];
export type LeadSourceInsert = Omit<
  Database["public"]["Tables"]["lead_sources"]["Insert"],
  "id"
>;
export type LeadSourceUpdate = Partial<LeadSourceInsert>;
