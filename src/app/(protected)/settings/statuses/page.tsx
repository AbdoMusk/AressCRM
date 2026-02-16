import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getStatuses } from "@/modules/settings/services/status.service";
import { StatusManager } from "@/modules/settings/components/StatusManager";
import { AppError } from "@/lib/utils/errors";

export const metadata = {
  title: "Lead Statuses — AressCRM",
};

export default async function StatusesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  let statuses = null;
  let error = null;

  try {
    statuses = await getStatuses(ctx);
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      error = "You don't have permission to manage lead statuses. Please contact your administrator.";
    } else {
      throw err;
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Lead Statuses
        </h1>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          <p className="font-medium">Access Denied</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Lead Statuses
      </h1>
      <StatusManager
        initialStatuses={statuses!}
        canCreate={ctx.permissions.has("settings:status:create")}
        canUpdate={ctx.permissions.has("settings:status:update")}
        canDelete={ctx.permissions.has("settings:status:delete")}
      />
    </div>
  );
}
