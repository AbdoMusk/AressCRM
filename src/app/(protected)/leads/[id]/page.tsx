import { redirect, notFound } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getLead } from "@/modules/leads/services/lead.service";
import { createClient } from "@/lib/supabase/server";
import { LeadDetail } from "@/modules/leads/components/LeadDetail";
import { AppError } from "@/lib/utils/errors";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) return { title: "Lead — AressCRM" };

  try {
    const { id } = await params;
    const lead = await getLead(ctx, id);
    return { title: `${lead.name} — AressCRM` };
  } catch {
    return { title: "Lead — AressCRM" };
  }
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const { id } = await params;

  let lead;
  try {
    lead = await getLead(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") {
      notFound();
    }
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lead
          </h1>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            <p className="font-medium">Access Denied</p>
            <p className="text-sm mt-1">
              You don&apos;t have permission to view this lead.
            </p>
          </div>
        </div>
      );
    }
    throw err;
  }

  const supabase = await createClient();
  const [
    { data: statuses },
    { data: sources },
    { data: profiles },
    { data: companies },
  ] = await Promise.all([
    supabase.from("lead_statuses").select("*").order("position"),
    supabase.from("lead_sources").select("*").order("position"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
    supabase.from("companies").select("id, name").order("name"),
  ]);

  const canUpdate =
    ctx.permissions.has("lead:update") ||
    (ctx.permissions.has("lead:update:own") &&
      lead.created_by === ctx.userId);
  const canDelete = ctx.permissions.has("lead:delete");

  return (
    <LeadDetail
      lead={lead}
      statuses={statuses ?? []}
      sources={sources ?? []}
      users={profiles ?? []}
      companies={companies ?? []}
      canUpdate={canUpdate}
      canDelete={canDelete}
    />
  );
}
