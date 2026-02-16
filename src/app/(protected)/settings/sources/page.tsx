import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getSources } from "@/modules/settings/services/source.service";
import { SourceManager } from "@/modules/settings/components/SourceManager";
import { AppError } from "@/lib/utils/errors";

export const metadata = {
  title: "Lead Sources — AressCRM",
};

export default async function SourcesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  let sources = null;
  let error = null;

  try {
    sources = await getSources(ctx);
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      error = "You don't have permission to manage lead sources. Please contact your administrator.";
    } else {
      throw err;
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Lead Sources
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
        Lead Sources
      </h1>
      <SourceManager
        initialSources={sources!}
        canCreate={ctx.permissions.has("settings:source:create")}
        canUpdate={ctx.permissions.has("settings:source:update")}
        canDelete={ctx.permissions.has("settings:source:delete")}
      />
    </div>
  );
}
