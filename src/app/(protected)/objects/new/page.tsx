import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getObjectTypes } from "@/modules/engine/services/object-type.service";
import { getModules } from "@/modules/engine/services/module.service";
import { ObjectCreateForm } from "@/modules/engine/components/ObjectCreateForm";
import type { ObjectTypeWithSchemas } from "@/modules/engine/types/object.types";
import { parseModuleSchema } from "@/modules/engine/types/module.types";

export const metadata = {
  title: "New Object — AressCRM",
};

export default async function NewObjectPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const params = await searchParams;
  const [objectTypes, allModules] = await Promise.all([
    getObjectTypes(ctx),
    getModules(ctx),
  ]);

  // Build a lookup of module schemas by ID
  const schemaMap = new Map(
    allModules.map((m) => [m.id, m.schema])
  );

  // Merge schemas into object types to produce ObjectTypeWithSchemas[]
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Create Object
      </h1>
      <ObjectCreateForm
        objectTypes={objectTypesWithSchemas}
        initialTypeId={params.type}
      />
      </div>
    </div>
  );
}
