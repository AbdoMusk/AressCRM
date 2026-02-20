import { redirect, notFound } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getPageBySlug } from "@/modules/engine/services/page.service";
import { getObjectTypes } from "@/modules/engine/services/object-type.service";
import { fetchWidgetData } from "@/modules/engine/services/query.service";
import { PageRenderer } from "@/modules/engine/components/PageRenderer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CustomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const { slug } = await params;
  const [page, objectTypes] = await Promise.all([
    getPageBySlug(ctx, slug),
    getObjectTypes(ctx),
  ]);
  if (!page) notFound();

  const isOwner = page.createdBy === ctx.userId;
  const otList = objectTypes.map((ot) => ({
    id: ot.id,
    name: ot.name,
    display_name: ot.display_name,
  }));

  // Fetch actual data for each widget
  const widgetData = await fetchWidgetData(ctx, page.widgets);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/pages"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {page.name}
          </h1>
          {page.description && (
            <p className="text-sm text-gray-500">{page.description}</p>
          )}
        </div>
      </div>

      <PageRenderer
        page={page}
        widgetData={widgetData}
        objectTypes={otList}
        isOwner={isOwner}
      />
      </div>
    </div>
  );
}
