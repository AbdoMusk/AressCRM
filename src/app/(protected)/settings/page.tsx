import Link from "next/link";
import { redirect } from "next/navigation";
import { Tags, Globe, Shield, Users } from "lucide-react";
import { getAuthContext } from "@/lib/permissions/rbac";

export const metadata = {
  title: "Settings — AressCRM",
};

const settingsLinks = [
  {
    label: "Lead Statuses",
    description: "Manage pipeline stages and status progression",
    href: "/settings/statuses",
    icon: <Tags size={24} />,
    permission: "settings:status:read",
  },
  {
    label: "Lead Sources",
    description: "Manage where your leads come from",
    href: "/settings/sources",
    icon: <Globe size={24} />,
    permission: "settings:source:read",
  },
  {
    label: "Roles & Permissions",
    description: "Manage user roles and access control",
    href: "/settings/roles",
    icon: <Shield size={24} />,
    permission: "role:manage",
  },
  {
    label: "User Management",
    description: "Manage users and assign roles",
    href: "/settings/users",
    icon: <Users size={24} />,
    permission: "user:manage",
  },
];

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const visibleLinks = settingsLinks.filter(
    (link) => ctx.permissions.has(link.permission)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Settings
      </h1>
      {visibleLinks.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">
            You don&apos;t have permission to access any settings. Contact your administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-blue-950"
            >
              <div className="text-gray-400">{link.icon}</div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {link.label}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {link.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
