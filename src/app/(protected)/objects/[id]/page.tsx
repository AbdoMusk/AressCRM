import { redirect, notFound } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getObject } from "@/modules/engine/services/object.service";
import { getRelations } from "@/modules/engine/services/relation.service";
import { getModules } from "@/modules/engine/services/module.service";
import { getObjectType } from "@/modules/engine/services/object-type.service";
import { getTimeline } from "@/modules/engine/services/timeline.service";
import { ObjectDetailTabs } from "./ObjectDetailTabs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Object — AressCRM",
};

export default async function ObjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const { id } = await params;

  const object = await getObject(ctx, id);
  if (!object) notFound();

  const [relations, allModules, objectType, timelineEvents] = await Promise.all([
    getRelations(ctx, id),
    getModules(ctx),
    getObjectType(ctx, object.object_type_id),
    getTimeline(ctx, id),
  ]);

  // Build required module IDs from object type (as array for client serialization)
  const requiredModuleIds =
    objectType?.modules
      .filter((m: { required: boolean }) => m.required)
      .map((m: { module_id: string }) => m.module_id) ?? [];

  // Available modules for attaching (those with schemas)
  const availableModules = allModules.map((m) => ({
    id: m.id,
    name: m.name,
    display_name: m.display_name,
    icon: m.icon,
    schema: m.schema,
  }));

  const typeName = objectType?.display_name ?? "Object";

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/objects"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs text-gray-500">{typeName}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {object.displayName || "Unnamed Object"}
          </h1>
        </div>
      </div>

      <ObjectDetailTabs
        object={object}
        relations={relations}
        timelineEvents={timelineEvents}
        availableModules={availableModules}
        requiredModuleIds={requiredModuleIds}
      />
      </div>
    </div>
  );
}
