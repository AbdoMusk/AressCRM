import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/permissions/rbac";
import { getPages } from "@/modules/engine/services/page.service";
import { PagesListClient } from "./PagesListClient";

export const metadata = {
  title: "Pages — AressCRM",
};

export default async function PagesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const pages = await getPages(ctx);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pages
          </h1>
        </div>
        <PagesListClient pages={pages} userId={ctx.userId} />
      </div>
    </div>
  );
}
