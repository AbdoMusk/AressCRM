import { createClient } from "@/lib/supabase/server";
import { requirePermission, type AuthContext } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { AppError } from "@/lib/utils/errors";

export async function getDashboardStats(ctx: AuthContext) {
  requirePermission(ctx, Actions.DASHBOARD_VIEW);
  const supabase = await createClient();

  // Total leads
  const { count: total } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });

  // Leads by status (via Postgres function)
  const { data: byStatus } = await supabase.rpc("leads_count_by_status");

  // Conversion rate from is_win/is_loss flags
  const won =
    byStatus
      ?.filter((s: { is_win: boolean }) => s.is_win)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reduce((sum: number, s: any) => sum + Number(s.count), 0) ?? 0;
  const lost =
    byStatus
      ?.filter((s: { is_loss: boolean }) => s.is_loss)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reduce((sum: number, s: any) => sum + Number(s.count), 0) ?? 0;
  const conversionRate =
    won + lost > 0 ? (won / (won + lost)) * 100 : 0;

  // Monthly evolution (last 12 months)
  const { data: monthly } = await supabase.rpc("leads_monthly_evolution");

  return {
    total: total ?? 0,
    byStatus: byStatus ?? [],
    conversionRate: Math.round(conversionRate * 10) / 10,
    monthly: monthly ?? [],
  };
}
