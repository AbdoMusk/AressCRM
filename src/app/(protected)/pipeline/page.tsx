import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/modules/pipeline/components/KanbanBoard";

export const metadata = {
  title: "Pipeline — AressCRM",
};

export default async function PipelinePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: statuses } = await supabase
    .from("lead_statuses")
    .select("*")
    .order("position");
  const { data: leads } = await supabase
    .from("leads")
    .select("*, lead_statuses(name, slug, color), lead_sources(name, slug)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Pipeline
      </h1>
      <KanbanBoard
        initialLeads={leads ?? []}
        statuses={statuses ?? []}
      />
    </div>
  );
}
