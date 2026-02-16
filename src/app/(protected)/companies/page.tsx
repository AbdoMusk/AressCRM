import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { createClient } from "@/lib/supabase/server";
import { getCompanies, getCompanyMembers } from "@/modules/companies/services/company.service";
import { CompanyManager } from "@/modules/companies/components/CompanyManager";
import { AppError } from "@/lib/utils/errors";

export const metadata = {
  title: "Companies — AressCRM",
};

export default async function CompaniesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  let companies = null;
  let error = null;

  try {
    companies = await getCompanies(ctx);
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      error =
        "You don't have permission to view companies. You need 'company:read' or 'company:read:own' permission.";
    } else {
      throw err;
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Companies
        </h1>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          <p className="font-medium">Access Denied</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Fetch users for assignment and member management
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name");

  // Fetch members for each company
  const companyMembers: Record<string, Awaited<ReturnType<typeof getCompanyMembers>>> = {};
  if (companies) {
    for (const company of companies) {
      try {
        companyMembers[company.id] = await getCompanyMembers(ctx, company.id);
      } catch {
        companyMembers[company.id] = [];
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Companies
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage companies, assign team members, and track associated leads.
        </p>
      </div>
      <CompanyManager
        companies={companies!}
        companyMembers={companyMembers}
        users={users ?? []}
        permissions={ctx.permissions}
      />
    </div>
  );
}
