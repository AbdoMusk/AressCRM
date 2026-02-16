import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getDashboardStats } from "@/modules/dashboard/services/dashboard.service";
import { StatsCards } from "@/modules/dashboard/components/StatsCards";
import { StatusChart } from "@/modules/dashboard/components/StatusChart";
import { MonthlyChart } from "@/modules/dashboard/components/MonthlyChart";
import { AppError } from "@/lib/utils/errors";

export const metadata = {
  title: "Dashboard — AressCRM",
};

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  let stats = null;
  let error = null;

  // CHANGE: Added error handling for permission errors
  // Prevents server crash when user lacks "dashboard:view" permission
  // (See CHANGES.md for context)
  try {
    stats = await getDashboardStats(ctx);
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      error = "You don't have permission to view the dashboard. Please contact your administrator.";
    } else {
      throw err; // Re-throw unexpected errors
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
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
        Dashboard
      </h1>
      <StatsCards
        total={stats!.total}
        conversionRate={stats!.conversionRate}
        byStatus={stats!.byStatus}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusChart data={stats!.byStatus} />
        <MonthlyChart data={stats!.monthly} />
      </div>
    </div>
  );
}
