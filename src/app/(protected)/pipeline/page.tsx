import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getPipelineObjects } from "@/modules/engine/services/query.service";
import { PipelineView } from "@/modules/engine/components/PipelineView";
import { AppError } from "@/lib/utils/errors";

export const metadata = {
  title: "Pipeline — AressCRM",
};

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const { type } = await searchParams;

  let pipelineData = null;
  let error = null;

  try {
    pipelineData = await getPipelineObjects(ctx, type);
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      error = "You don't have permission to view the pipeline.";
    } else {
      throw err;
    }
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pipeline
          </h1>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
            <p className="font-medium">Access Denied</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pipeline
        </h1>
      {pipelineData && pipelineData.objects.length > 0 ? (
        <PipelineView
          objects={pipelineData.objects}
          statusOptions={pipelineData.statusOptions}
          objectTypeName={type}
        />
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-gray-500">
            No objects with a stage module found.
            Create objects with a &quot;stage&quot; module to see them in the pipeline.
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
