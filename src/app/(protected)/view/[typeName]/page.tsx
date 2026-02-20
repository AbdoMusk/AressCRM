import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { getObjects } from "@/modules/engine/services/object.service";
import { getViewsForType, ensureDefaultView } from "@/modules/engine/services/view.service";
import { parseModuleSchema } from "@/modules/engine/types/module.types";
import { ViewPageClient } from "./ViewPageClient";

export default async function ViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ typeName: string }>;
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const { typeName } = await params;
  const { view: viewId, page } = await searchParams;

  const admin = createAdminClient();

  // 1. Look up the object type by name
  const { data: objectType } = await admin
    .from("object_types")
    .select("*")
    .eq("name", typeName)
    .single();

  if (!objectType) notFound();

  // 2. Load modules for this object type (with schemas)
  const { data: typeModuleMappings } = await admin
    .from("object_type_modules")
    .select("module_id, required, position, modules(id, name, display_name, icon, schema)")
    .eq("object_type_id", objectType.id)
    .order("position");

  const moduleSchemas = (typeModuleMappings ?? []).map((m) => {
    const mod = (m as any).modules;
    return {
      moduleId: mod.id as string,
      moduleName: mod.name as string,
      displayName: mod.display_name as string,
      icon: mod.icon as string | null,
      schema: parseModuleSchema(mod.schema),
      required: m.required,
      position: m.position,
    };
  });

  // 3. Load views — ensure default exists
  await ensureDefaultView(ctx, objectType.id, objectType.display_name);
  const views = await getViewsForType(ctx, objectType.id);

  // 4. Find active view
  const activeView = viewId
    ? views.find((v) => v.id === viewId) ?? views[0]
    : views[0];

  if (!activeView) {
    // Should never happen since we ensured default
    notFound();
  }

  // 5. Load objects with filters from the active view
  const currentPage = page ? parseInt(page, 10) : 1;

  // Convert view filters to ObjectFilter format
  const objectFilters = activeView.filters.map((f) => ({
    moduleName: f.module,
    fieldKey: f.field,
    operator: f.operator as any,
    value: f.value as any,
  }));

  // Convert view sorts
  const sortModule = activeView.sorts?.[0]?.module;
  const sortField = activeView.sorts?.[0]?.field;
  const sortOrder = activeView.sorts?.[0]?.direction;

  const { objects, total } = await getObjects(ctx, {
    objectType: typeName,
    filters: objectFilters.length > 0 ? objectFilters : undefined,
    sortModule,
    sortField,
    sortOrder,
    page: currentPage,
    limit: 50,
  });

  // 6. Build available fields for filter/sort/column config
  const availableFields = moduleSchemas.flatMap((mod) =>
    mod.schema.fields.map((field) => ({
      module: mod.moduleName,
      field: field.key,
      label: `${mod.displayName} — ${field.label}`,
      fieldDef: field,
    }))
  );

  // 7. Build column definitions
  // If the view has visible fields configured, use those.
  // Otherwise, show all fields from all modules.
  const columns =
    activeView.visibleFields.length > 0
      ? activeView.visibleFields
          .map((vf) => {
            const af = availableFields.find(
              (a) => a.module === vf.module && a.field === vf.field
            );
            if (!af) return null;
            return {
              module: vf.module,
              field: vf.field,
              label: af.label,
              fieldDef: af.fieldDef,
              width: vf.width ?? 150,
              position: vf.position,
            };
          })
          .filter(Boolean)
      : availableFields.map((af, idx) => ({
          module: af.module,
          field: af.field,
          label: af.label,
          fieldDef: af.fieldDef,
          width: 150,
          position: idx,
        }));

  // 8. Find kanban field definition if needed
  let kanbanFieldDef = null;
  if (activeView.kanbanModuleName && activeView.kanbanFieldKey) {
    kanbanFieldDef = availableFields.find(
      (af) =>
        af.module === activeView.kanbanModuleName &&
        af.field === activeView.kanbanFieldKey
    )?.fieldDef ?? null;
  }
  // If switching to kanban but no kanban field set, try to find a select field
  if (activeView.layoutType === "kanban" && !kanbanFieldDef) {
    const selectField = availableFields.find((af) => af.fieldDef.type === "select");
    if (selectField) {
      kanbanFieldDef = selectField.fieldDef;
    }
  }

  // Serialize for client
  const serializedViews = views.map((v) => ({
    ...v,
  }));

  return (
    <ViewPageClient
      objectType={{
        id: objectType.id,
        name: objectType.name,
        displayName: objectType.display_name,
        icon: objectType.icon,
        color: objectType.color,
      }}
      views={serializedViews}
      activeViewId={activeView.id}
      objects={objects}
      total={total}
      currentPage={currentPage}
      columns={columns as any}
      availableFields={availableFields}
      kanbanFieldDef={kanbanFieldDef}
      kanbanModuleName={activeView.kanbanModuleName ?? availableFields.find((af) => af.fieldDef.type === "select")?.module ?? null}
      kanbanFieldKey={activeView.kanbanFieldKey ?? availableFields.find((af) => af.fieldDef.type === "select")?.field ?? null}
    />
  );
}
