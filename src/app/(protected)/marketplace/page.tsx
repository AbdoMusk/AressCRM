import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getMarketplaceProjects } from "@/modules/engine/services/marketplace.service";
import { MarketplaceClient } from "./MarketplaceClient";

export const metadata = { title: "Projects Marketplace — AressCRM" };

export default async function MarketplacePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const projects = await getMarketplaceProjects(ctx);

  return <MarketplaceClient projects={projects} currentUserId={ctx.userId} />;
}
