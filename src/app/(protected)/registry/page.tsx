import { redirect } from "next/navigation";
import { getAuthContext, requirePermission } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { getModules } from "@/modules/engine/services/module.service";
import { getObjectTypes } from "@/modules/engine/services/object-type.service";
import { getObjectTypeRelations } from "@/modules/engine/services/object-type-relation.service";
import { DataModelHub } from "@/modules/engine/components/DataModelHub";
import type { ModuleRowTyped } from "@/modules/engine/types/module.types";
import { parseModuleSchema } from "@/modules/engine/types/module.types";

export const metadata = {
  title: "Data Model — AressCRM",
};

export default async function RegistryPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  try {
    requirePermission(ctx, Actions.MODULE_MANAGE);
  } catch {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Data Model
          </h1>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          <p className="font-medium">Access Denied</p>
          <p className="mt-1 text-sm">
            You need module management permissions to access the data model.
          </p>
        </div>
        </div>
      </div>
    );
  }

  const [rawModules, objectTypes, relations] = await Promise.all([
    getModules(ctx),
    getObjectTypes(ctx),
    getObjectTypeRelations(ctx),
  ]);

  // Ensure schemas are parsed
  const modules: ModuleRowTyped[] = rawModules.map((m) => ({
    ...m,
    schema:
      typeof m.schema === "object" && m.schema !== null && "fields" in m.schema
        ? m.schema
        : parseModuleSchema(m.schema as any),
  }));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <DataModelHub
        modules={modules}
        objectTypes={objectTypes}
        relations={relations}
      />
    </div>
  );
}
