import { redirect } from "next/navigation";
import { getAuthContext, requirePermission } from "@/lib/permissions/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { Actions } from "@/lib/permissions/actions";
import { AuditLogViewer } from "@/modules/audit/components/AuditLogViewer";
import { AppError } from "@/lib/utils/errors";

export const metadata = {
  title: "Audit Logs — AressCRM",
};

export default async function AuditPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  try {
    requirePermission(ctx, Actions.AUDIT_VIEW);
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      return (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Audit Logs
            </h1>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
              <p className="font-medium">Access Denied</p>
              <p className="mt-1 text-sm">
                You don&apos;t have permission to view audit logs.
              </p>
            </div>
          </div>
        </div>
      );
    }
    throw err;
  }

  const admin = createAdminClient();
  const { data: logs, count } = await admin
    .from("audit_logs")
    .select("*, profiles:user_id(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, 24);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track all platform activity — authentication, data changes, settings, and admin actions.
          </p>
        </div>
        <AuditLogViewer
          initialLogs={(logs as any) ?? []}
          initialTotal={count ?? 0}
        />
      </div>
    </div>
  );
}
