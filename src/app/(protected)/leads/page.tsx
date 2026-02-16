import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getLeads } from "@/modules/leads/services/lead.service";
import { createClient } from "@/lib/supabase/server";
import { LeadTable } from "@/modules/leads/components/LeadTable";
import { LeadFormDialog } from "@/modules/leads/components/LeadFormDialog";
import { AppError } from "@/lib/utils/errors";

export const metadata = {
  title: "Leads — AressCRM",
};

export default async function LeadsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  let leads = null;
  let error = null;

  try {
    leads = await getLeads(ctx);
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      error = "You don't have permission to view leads. Please contact your administrator.";
    } else {
      throw err;
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Leads
        </h1>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          <p className="font-medium">Access Denied</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: statuses } = await supabase
    .from("lead_statuses")
    .select("*")
    .order("position");
  const { data: sources } = await supabase
    .from("lead_sources")
    .select("*")
    .order("position");
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name");
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Leads
        </h1>
        {ctx.permissions.has("lead:create") && (
          <LeadFormDialog
            statuses={statuses ?? []}
            sources={sources ?? []}
            users={profiles ?? []}
            companies={companies ?? []}
          />
        )}
      </div>
      <LeadTable
        leads={leads!}
        permissions={Array.from(ctx.permissions)}
        statuses={statuses ?? []}
        sources={sources ?? []}
        users={profiles ?? []}
        companies={companies ?? []}
      />
    </div>
  );
}
