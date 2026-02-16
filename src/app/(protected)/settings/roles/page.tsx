import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getRoles, getAllPermissions } from "@/modules/roles/services/role.service";
import { RoleManager } from "@/modules/roles/components/RoleManager";
import { AppError } from "@/lib/utils/errors";

export const metadata = {
  title: "Roles & Permissions — AressCRM",
};

export default async function RolesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  let roles = null;
  let permissions = null;
  let error = null;

  try {
    [roles, permissions] = await Promise.all([
      getRoles(ctx),
      getAllPermissions(ctx),
    ]);
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      error =
        "You don't have permission to manage roles. Only admins can access this page.";
    } else {
      throw err;
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Roles & Permissions
        </h1>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          <p className="font-medium">Access Denied</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Roles & Permissions
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create and manage roles with granular permission control.
        </p>
      </div>
      <RoleManager initialRoles={roles!} allPermissions={permissions!} />
    </div>
  );
}
