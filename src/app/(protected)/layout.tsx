import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  // Convert Set to array for client component serialization
  const permArray = Array.from(ctx.permissions);

  // Load object types for sidebar navigation
  const admin = createAdminClient();
  const { data: objectTypes } = await admin
    .from("object_types")
    .select("id, name, display_name, icon, color")
    .order("display_name");

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950">
      <AppSidebar permissions={permArray} objectTypes={objectTypes ?? []} userId={ctx.userId} userEmail={ctx.email} />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
