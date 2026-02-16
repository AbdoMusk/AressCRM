"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles?: { full_name: string } | null;
}

interface Props {
  initialLogs: AuditLog[];
  initialTotal: number;
}

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "auth", label: "Authentication" },
  { value: "data", label: "Data Changes" },
  { value: "settings", label: "Settings" },
  { value: "admin", label: "Admin" },
];

const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  data: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  settings: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
};

const PAGE_SIZE = 25;

export function AuditLogViewer({ initialLogs, initialTotal }: Props) {
  const [logs, setLogs] = useState(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [searchAction, setSearchAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchLogs = useCallback(async (p: number, cat: string, action: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from("audit_logs")
        .select("*, profiles:user_id(full_name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((p - 1) * PAGE_SIZE, p * PAGE_SIZE - 1);

      if (cat) query = query.eq("category", cat);
      if (action) query = query.ilike("action", `%${action}%`);

      const { data, count } = await query;
      setLogs((data as AuditLog[]) ?? []);
      setTotal(count ?? 0);
    } catch {
      // silently fail — logs are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch whenever filter/page changes (skip initial load)
  useEffect(() => {
    if (page === 1 && !category && !searchAction) return;
    fetchLogs(page, category, searchAction);
  }, [page, category, fetchLogs, searchAction]);

  function handleFilterChange(cat: string) {
    setCategory(cat);
    setPage(1);
  }

  function handleSearch(action: string) {
    setSearchAction(action);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={category}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchAction}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search actions…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {total} record(s)
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Time
              </th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                User
              </th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Category
              </th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Action
              </th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Entity
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
                    Loading…
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    onClick={() =>
                      setExpandedId(expandedId === log.id ? null : log.id)
                    }
                    className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-gray-800/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {log.profiles?.full_name ?? "System"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          CATEGORY_COLORS[log.category] ??
                          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {log.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {log.entity_type ? (
                        <span>
                          {log.entity_type}
                          {log.entity_id && (
                            <span className="ml-1 font-mono text-xs text-gray-400">
                              {log.entity_id.slice(0, 8)}…
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-detail`}>
                      <td
                        colSpan={5}
                        className="bg-gray-50 px-4 py-3 dark:bg-gray-800/50"
                      >
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {log.old_values && (
                            <div>
                              <h4 className="mb-1 font-semibold text-gray-600 dark:text-gray-400">
                                Previous Values
                              </h4>
                              <pre className="max-h-40 overflow-auto rounded bg-white p-2 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                {JSON.stringify(log.old_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div>
                              <h4 className="mb-1 font-semibold text-gray-600 dark:text-gray-400">
                                New Values
                              </h4>
                              <pre className="max-h-40 overflow-auto rounded bg-white p-2 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                {JSON.stringify(log.new_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.metadata &&
                            Object.keys(log.metadata).length > 0 && (
                              <div>
                                <h4 className="mb-1 font-semibold text-gray-600 dark:text-gray-400">
                                  Metadata
                                </h4>
                                <pre className="max-h-40 overflow-auto rounded bg-white p-2 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          {!log.old_values &&
                            !log.new_values &&
                            (!log.metadata ||
                              Object.keys(log.metadata).length === 0) && (
                              <p className="text-gray-400">
                                No additional details.
                              </p>
                            )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-300 p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-gray-300 p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
