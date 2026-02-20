import { redirect, notFound } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getObjectTypes } from "@/modules/engine/services/object-type.service";
import { getModules } from "@/modules/engine/services/module.service";
import { ObjectCreateForm } from "@/modules/engine/components/ObjectCreateForm";
import type { ObjectTypeWithSchemas } from "@/modules/engine/types/object.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewRecordPage({
  params,
}: {
  params: Promise<{ typeName: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const { typeName } = await params;
  const admin = createAdminClient();

  // Resolve the object type
  const { data: objectType } = await admin
    .from("object_types")
    .select("id, display_name")
    .eq("name", typeName)
    .single();

  if (!objectType) notFound();

  const [objectTypes, allModules] = await Promise.all([
    getObjectTypes(ctx),
    getModules(ctx),
  ]);

  const schemaMap = new Map(allModules.map((m) => [m.id, m.schema]));

  const objectTypesWithSchemas: ObjectTypeWithSchemas[] = objectTypes.map(
    (ot) => ({
      ...ot,
      modules: ot.modules.map((m) => ({
        ...m,
        schema: schemaMap.get(m.module_id) ?? { fields: [] },
      })),
    })
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/view/${typeName}`}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            New {objectType.display_name}
          </h1>
        </div>
        <ObjectCreateForm
          objectTypes={objectTypesWithSchemas}
          initialTypeId={objectType.id}
        />
      </div>
    </div>
  );
}
