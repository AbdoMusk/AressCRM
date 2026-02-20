"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState } from "react";
import {
  Search,
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  Star,
  Plus,
  BarChart3,
  Database,
} from "lucide-react";

// ── Types ────────────────────────────────────

interface ObjectTypeNav {
  id: string;
  name: string;
  display_name: string;
  icon: string | null;
  color: string | null;
}

interface SidebarProps {
  permissions: string[];
  objectTypes?: ObjectTypeNav[];
}

// ── Component ────────────────────────────────

export function AppSidebar({ permissions, objectTypes = [] }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const hasObjectRead =
    permissions.includes("object:read") || permissions.includes("object:read:own");
  const hasSettings =
    permissions.includes("role:manage") ||
    permissions.includes("user:manage") ||
    permissions.includes("settings:manage") ||
    permissions.includes("module:manage") ||
    permissions.includes("object_type:manage");
  const hasRegistry =
    permissions.includes("module:manage") ||
    permissions.includes("object_type:manage");

  return (
    <aside
      className={clsx(
        "flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-800 dark:bg-gray-950",
        collapsed ? "w-[52px]" : "w-[220px]"
      )}
    >
      {/* ── Header: Logo + Collapse ── */}
      <div className="flex h-12 items-center justify-between border-b border-gray-100 px-3 dark:border-gray-800/60">
        {!collapsed && (
          <Image
            src="/aress-CRM-logo.png"
            alt="AressCRM"
            width={320}
            height={116}
            className="h-8 w-auto"
            priority
          />
        )}
        {collapsed && (
          <Image
            src="/aress-CRM-favicon.png"
            alt="AressCRM"
            width={24}
            height={24}
            className="mx-auto h-6 w-6"
          />
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* ── Search ── */}
      {!collapsed && (
        <div className="px-2 pt-2">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex w-full items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-500 dark:border-gray-800 dark:hover:border-gray-700"
          >
            <Search size={14} />
            <span>Search</span>
            <kbd className="ml-auto rounded border border-gray-200 px-1 text-[10px] text-gray-300 dark:border-gray-700">
              /
            </kbd>
          </button>
        </div>
      )}
      {collapsed && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => { setCollapsed(false); setSearchOpen(true); }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Search size={16} />
          </button>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2 pt-3">
        {/* Favorites section - placeholder for future */}

        {/* Main Links */}
        {permissions.includes("dashboard:view") && (
          <NavItem
            href="/dashboard"
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active={pathname === "/dashboard"}
            collapsed={collapsed}
          />
        )}

        {/* ── Object Types ── */}
        {hasObjectRead && objectTypes.length > 0 && (
          <>
            {!collapsed && (
              <div className="mt-4 mb-1 flex items-center justify-between px-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Objects
                </span>
              </div>
            )}
            {collapsed && <div className="mt-3 mb-1 border-t border-gray-100 dark:border-gray-800" />}
            {objectTypes.map((ot) => {
              const href = `/view/${ot.name}`;
              const isActive = pathname === href || pathname.startsWith(href + "/");

              return (
                <NavItem
                  key={ot.id}
                  href={href}
                  icon={
                    <span
                      className="inline-block h-3.5 w-3.5 flex-shrink-0 rounded"
                      style={{ backgroundColor: ot.color ?? "#6B7280" }}
                    />
                  }
                  label={ot.display_name}
                  active={isActive}
                  collapsed={collapsed}
                />
              );
            })}
          </>
        )}

        {/* ── Audit ── */}
        {permissions.includes("audit:view") && (
          <>
            {!collapsed && <div className="mt-3 mb-1 border-t border-gray-100 pt-2 dark:border-gray-800" />}
            {collapsed && <div className="mt-3 mb-1 border-t border-gray-100 dark:border-gray-800" />}
            <NavItem
              href="/audit"
              icon={<ScrollText size={18} />}
              label="Audit Logs"
              active={pathname === "/audit"}
              collapsed={collapsed}
            />
          </>
        )}

        {/* ── Registry ── */}
        {hasRegistry && (
          <NavItem
            href="/registry"
            icon={<Database size={18} />}
            label="Registry"
            active={pathname === "/registry" || pathname.startsWith("/registry/")}
            collapsed={collapsed}
          />
        )}
      </nav>

      {/* ── Footer: Settings + Expand ── */}
      <div className="border-t border-gray-100 px-2 py-2 dark:border-gray-800">
        {hasSettings && (
          <NavItem
            href="/settings"
            icon={<Settings size={18} />}
            label="Settings"
            active={pathname.startsWith("/settings")}
            collapsed={collapsed}
          />
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mt-1 flex w-full items-center justify-center rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}

// ── Nav Item ─────────────────────────────────

function NavItem({
  href,
  icon,
  label,
  active,
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-white",
        collapsed && "justify-center px-0"
      )}
      title={collapsed ? label : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
