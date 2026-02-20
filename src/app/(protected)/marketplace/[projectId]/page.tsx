import { redirect, notFound } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getMarketplaceProject } from "@/modules/engine/services/marketplace.service";
import { MarketplaceProjectClient } from "./MarketplaceProjectClient";
import { AppError } from "@/lib/utils/errors";

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  return { title: "Project Details — AressCRM" };
}

export default async function MarketplaceProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const { projectId } = await params;

  let detail;
  try {
    detail = await getMarketplaceProject(ctx, projectId);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  return (
    <MarketplaceProjectClient
      project={detail.project}
      proposals={detail.proposals}
      userProposal={detail.userProposal}
      isOwner={detail.isOwner}
      proposalTypeModules={detail.proposalTypeModules}
      currentUserId={ctx.userId}
      permissions={Array.from(ctx.permissions)}
    />
  );
}
