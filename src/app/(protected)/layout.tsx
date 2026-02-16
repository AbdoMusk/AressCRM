import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/permissions/rbac";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  // Convert Set to array for client component serialization
  const permArray = Array.from(ctx.permissions);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar permissions={permArray} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userId={ctx.userId} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
