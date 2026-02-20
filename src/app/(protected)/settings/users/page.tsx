import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getUsers } from "@/modules/users/services/user.service";
import { createClient } from "@/lib/supabase/server";
import { UserManager } from "@/modules/users/components/UserManager";
import { AppError } from "@/lib/utils/errors";

export const metadata = {
  title: "User Management — AressCRM",
};

export default async function UsersPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  let users = null;
  let error = null;

  try {
    users = await getUsers(ctx);
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      error =
        "You don't have permission to manage users. Only admins can access this page.";
    } else {
      throw err;
    }
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            <p className="font-medium">Access Denied</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch all roles for the assignment dropdown
  const supabase = await createClient();
  const { data: roles } = await supabase
    .from("roles")
    .select("id, name")
    .order("name");

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          User Management
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View all users, assign or revoke roles, and manage profiles.
        </p>
      </div>
      <UserManager
        initialUsers={users!}
        allRoles={roles ?? []}
        currentUserId={ctx.userId}
      />
      </div>
    </div>
  );
}
