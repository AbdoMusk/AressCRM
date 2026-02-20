"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Search,
  Briefcase,
  Users,
  Calendar,
  DollarSign,
  ArrowRight,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { clsx } from "clsx";
import type { MarketplaceProject } from "@/modules/engine/services/marketplace.service";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Pull a human-readable summary value from a module's data. */
function extractField(
  modules: MarketplaceProject["modules"],
  moduleName: string,
  ...fieldKeys: string[]
): string | undefined {
  const mod = modules.find((m) => m.moduleName === moduleName);
  if (!mod) return undefined;
  for (const key of fieldKeys) {
    const v = mod.data[key];
    if (v != null && v !== "") return String(v);
  }
  return undefined;
}

function formatCurrency(val: string | undefined): string {
  if (!val) return "";
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Props {
  projects: MarketplaceProject[];
  currentUserId: string;
}

export function MarketplaceClient({ projects, currentUserId }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "proposals" | "name">("newest");

  const filtered = useMemo(() => {
    let list = projects;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.ownerName.toLowerCase().includes(q) ||
          p.modules.some((m) =>
            Object.values(m.data).some((v) => String(v).toLowerCase().includes(q))
          )
      );
    }

    list = [...list].sort((a, b) => {
      if (sortBy === "proposals") return b.proposalCount - a.proposalCount;
      if (sortBy === "name") return a.displayName.localeCompare(b.displayName);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [projects, search, sortBy]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
              <Store size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Projects Marketplace
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Browse public projects and submit proposals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-60 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900">
              <SlidersHorizontal size={14} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="border-0 bg-transparent text-sm text-gray-600 focus:outline-none dark:text-gray-300"
              >
                <option value="newest">Newest</option>
                <option value="proposals">Most Proposals</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <EmptyState hasProjects={projects.length > 0} />
        ) : (
          <>
            <p className="mb-5 text-sm text-gray-400 dark:text-gray-500">
              {filtered.length} project{filtered.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isOwner={
                    project.owner_id === currentUserId ||
                    project.created_by === currentUserId
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProjectCard                                                        */
/* ------------------------------------------------------------------ */

function ProjectCard({
  project,
  isOwner,
}: {
  project: MarketplaceProject;
  isOwner: boolean;
}) {
  const description =
    extractField(project.modules, "identity", "description", "notes") ??
    extractField(project.modules, "description", "description", "text", "content") ??
    extractField(project.modules, "public_project", "description", "details");

  const amount = extractField(project.modules, "monetary", "amount", "value", "budget");
  const currency = extractField(project.modules, "monetary", "currency") ?? "USD";
  const stage =
    extractField(project.modules, "stage", "stage", "status") ??
    extractField(project.modules, "public_project", "status");
  const deadline = extractField(project.modules, "identity", "deadline", "due_date") ??
    extractField(project.modules, "public_project", "deadline", "due_date");

  return (
    <Link
      href={`/marketplace/${project.id}`}
      className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700 dark:hover:shadow-indigo-950/30"
    >
      {/* Top row: name + badge */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
            {project.displayName}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
            <Briefcase size={12} />
            {project.object_type?.display_name ?? project.object_type?.name ?? "Project"}
          </p>
        </div>
        {isOwner && (
          <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800">
            Your Project
          </span>
        )}
        {stage && !isOwner && (
          <span className="whitespace-nowrap rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:ring-indigo-800">
            {stage}
          </span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}

      {/* Meta chips */}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        {amount && (
          <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <DollarSign size={12} />
            {formatCurrency(amount)}
          </span>
        )}
        <span className="flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <Users size={12} />
          {project.proposalCount} proposal{project.proposalCount !== 1 ? "s" : ""}
        </span>
        {deadline && (
          <span className="flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <Calendar size={12} />
            {new Date(deadline).toLocaleDateString()}
          </span>
        )}
        <span className="ml-auto text-[10px] text-gray-400">{timeAgo(project.created_at)}</span>
      </div>

      {/* Hover arrow */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <ArrowRight size={18} className="text-indigo-400" />
      </div>

      {/* Owner line */}
      <div className="mt-3 flex items-center gap-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-[10px] font-bold text-white">
          {project.ownerName.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs text-gray-400">{project.ownerName}</span>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ hasProjects }: { hasProjects: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <Store size={28} className="text-gray-400" />
      </div>
      {hasProjects ? (
        <>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            No matching projects
          </h2>
          <p className="mt-1 text-sm text-gray-400">Try a different search term.</p>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            No public projects yet
          </h2>
          <p className="mt-1 max-w-md text-sm text-gray-400">
            Projects appear here when they have a <strong>public_project</strong> module
            with a boolean field set to <strong>true</strong>. Create a project and mark
            it as public to get started.
          </p>
        </>
      )}
    </div>
  );
}
