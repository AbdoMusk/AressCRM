import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import {
  getDashboardStats,
  countByField,
  getEnhancedDashboardData,
} from "@/modules/engine/services/query.service";
import { EnhancedDashboardView } from "@/modules/engine/components/EnhancedDashboardView";
import { AppError } from "@/lib/utils/errors";

export const metadata = {
  title: "Dashboard — AressCRM",
};

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  let stats = null;
  let pipeline: any[] = [];
  let monetary: any = null;
  let conversion: any = null;
  let monthly: any[] = [];
  let error = null;

  try {
    const data = await getEnhancedDashboardData(ctx);
    stats = data.stats;
    pipeline = data.pipeline;
    monetary = data.monetary;
    conversion = data.conversion;
    monthly = data.monthly;
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      error =
        "You don't have permission to view the dashboard. Please contact your administrator.";
    } else {
      throw err;
    }
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
            <p className="font-medium">Access Denied</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <EnhancedDashboardView
        stats={stats!}
        pipeline={pipeline}
        monetary={monetary}
        conversion={conversion}
        monthly={monthly}
        />
      </div>
    </div>
  );
}
