import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getObjects } from "@/modules/engine/services/object.service";
import { getObjectTypes } from "@/modules/engine/services/object-type.service";
import { ObjectList } from "@/modules/engine/components/ObjectList";
import { AppError } from "@/lib/utils/errors";

export const metadata = {
  title: "Objects — AressCRM",
};

export default async function ObjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 25;

  let objectsResult: { objects: any[]; total: number } | null = null;
  let objectTypes: any[] | null = null;
  let error: string | null = null;

  try {
    const allTypes = await getObjectTypes(ctx);
    objectTypes = allTypes;

    let objectTypeName: string | undefined;
    if (params.type) {
      const matchedType = allTypes.find((t) => t.id === params.type);
      if (matchedType) {
        objectTypeName = matchedType.name;
      }
    }

    objectsResult = await getObjects(ctx, {
      objectType: objectTypeName,
      page,
      limit: pageSize,
    });
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      error =
        "You don't have permission to view objects. Please contact your administrator.";
    } else {
      throw err;
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Objects
        </h1>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          <p className="font-medium">Access Denied</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Objects
      </h1>
      <ObjectList
        objects={objectsResult?.objects ?? []}
        objectTypes={objectTypes ?? []}
        selectedType={params.type}
      />
    </div>
  );
}
