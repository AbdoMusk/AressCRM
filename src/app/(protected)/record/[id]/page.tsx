import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getObject } from "@/modules/engine/services/object.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseModuleSchema } from "@/modules/engine/types/module.types";
import { RecordDetailClient } from "./RecordDetailClient";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const { id } = await params;

  let object;
  try {
    object = await getObject(ctx, id);
  } catch {
    notFound();
  }

  const admin = createAdminClient();

  // Load available modules for the object type (for attach/detach)
  const { data: typeModules } = await admin
    .from("object_type_modules")
    .select("module_id, required, position, modules(id, name, display_name, icon, schema)")
    .eq("object_type_id", object.object_type_id)
    .order("position");

  const availableModules = (typeModules ?? []).map((tm) => {
    const mod = (tm as any).modules;
    return {
      id: mod.id as string,
      name: mod.name as string,
      display_name: mod.display_name as string,
      icon: mod.icon as string | null,
      schema: parseModuleSchema(mod.schema),
    };
  });

  const requiredModuleIds = (typeModules ?? [])
    .filter((tm) => tm.required)
    .map((tm) => tm.module_id);

  // Load relations
  const { data: relationsFrom } = await admin
    .from("object_relations")
    .select("id, relation_type, to_object_id")
    .eq("from_object_id", id);

  const { data: relationsTo } = await admin
    .from("object_relations")
    .select("id, relation_type, from_object_id")
    .eq("to_object_id", id);

  // Load related object display names
  const relatedIds = [
    ...(relationsFrom ?? []).map((r) => r.to_object_id),
    ...(relationsTo ?? []).map((r) => r.from_object_id),
  ];

  let relatedObjects: Record<string, { displayName: string; typeName: string }> = {};
  if (relatedIds.length > 0) {
    const { data: relObjs } = await admin
      .from("objects")
      .select("id, object_types(name, display_name)")
      .in("id", relatedIds);

    for (const ro of relObjs ?? []) {
      relatedObjects[ro.id] = {
        displayName: ro.id.slice(0, 8), // Will be enriched client-side
        typeName: (ro as any).object_types?.display_name ?? "Unknown",
      };
    }
  }

  const relations = [
    ...(relationsFrom ?? []).map((r) => ({
      relationId: r.id,
      relationType: r.relation_type,
      direction: "outgoing" as const,
      objectId: r.to_object_id,
      objectTypeName: relatedObjects[r.to_object_id]?.typeName ?? "Unknown",
    })),
    ...(relationsTo ?? []).map((r) => ({
      relationId: r.id,
      relationType: r.relation_type,
      direction: "incoming" as const,
      objectId: r.from_object_id,
      objectTypeName: relatedObjects[r.from_object_id]?.typeName ?? "Unknown",
    })),
  ];

  // Load timeline events
  const { data: timeline } = await admin
    .from("timeline_events")
    .select("*")
    .eq("object_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <RecordDetailClient
      object={object}
      availableModules={availableModules}
      requiredModuleIds={requiredModuleIds}
      relations={relations}
      timeline={timeline ?? []}
      permissions={Array.from(ctx.permissions)}
    />
  );
}
