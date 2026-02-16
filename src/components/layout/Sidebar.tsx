"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  ScrollText,
  Shield,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
  /** Show if user has ANY of these permissions */
  permissionAny?: string[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={20} />,
    permission: "dashboard:view",
  },
  {
    label: "Leads",
    href: "/leads",
    icon: <Users size={20} />,
    permissionAny: ["lead:read", "lead:read:own"],
  },
  {
    label: "Pipeline",
    href: "/pipeline",
    icon: <Kanban size={20} />,
    permissionAny: ["lead:read", "lead:read:own"],
  },
  {
    label: "Companies",
    href: "/companies",
    icon: <Building2 size={20} />,
    permissionAny: ["company:read", "company:read:own"],
  },
  {
    label: "Audit Logs",
    href: "/audit",
    icon: <ScrollText size={20} />,
    permission: "audit:view",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings size={20} />,
    permissionAny: [
      "settings:status:read",
      "settings:source:read",
      "role:manage",
      "user:manage",
    ],
  },
];

export function Sidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter((item) => {
    if (item.permission) return permissions.includes(item.permission);
    if (item.permissionAny) return item.permissionAny.some((p) => permissions.includes(p));
    return true;
  });

  return (
    <aside
      className={clsx(
        "flex flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-800 dark:bg-gray-900",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
        {!collapsed && (
          <Image
            src="/aress-CRM-logo.png"
            alt="AressCRM"
            width={320}
            height={116}
            className="h-14 w-auto"
            priority
          />
        )}
        {collapsed && (
          <Image
            src="/aress-CRM-favicon.png"
            alt="AressCRM"
            width={28}
            height={28}
            className="h-7 w-7"
          />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              )}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
