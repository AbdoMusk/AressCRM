"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";

interface FilterState {
  search: string;
  statusId: string;
  sourceId: string;
  assignedTo: string;
}

interface Props {
  statuses: { id: string; name: string; color: string }[];
  sources: { id: string; name: string }[];
  users?: { id: string; full_name: string }[];
  onFilterChange: (filters: FilterState) => void;
}

export function LeadFilters({ statuses, sources, users, onFilterChange }: Props) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    statusId: "",
    sourceId: "",
    assignedTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  function update(key: keyof FilterState, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilterChange(next);
  }

  function clearAll() {
    const cleared: FilterState = { search: "", statusId: "", sourceId: "", assignedTo: "" };
    setFilters(cleared);
    onFilterChange(cleared);
  }

  const activeCount = [filters.statusId, filters.sourceId, filters.assignedTo].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search leads by name, email, or company..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
          {filters.search && (
            <button
              onClick={() => update("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Toggle filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            showFilters || activeCount > 0
              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300"
              : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
        >
          <Filter size={16} />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs text-white">
              {activeCount}
            </span>
          )}
        </button>

        {/* Clear all */}
        {(activeCount > 0 || filters.search) && (
          <button
            onClick={clearAll}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
          {/* Status filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Status
            </label>
            <select
              value={filters.statusId}
              onChange={(e) => update("statusId", e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Source filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Source
            </label>
            <select
              value={filters.sourceId}
              onChange={(e) => update("sourceId", e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To filter */}
          {users && users.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Assigned To
              </label>
              <select
                value={filters.assignedTo}
                onChange={(e) => update("assignedTo", e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">All users</option>
                <option value="__unassigned__">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { FilterState };
