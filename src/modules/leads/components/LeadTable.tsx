"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Trash2, Edit, Eye } from "lucide-react";
import { clsx } from "clsx";
import { deleteLeadAction } from "@/modules/leads/actions/lead.actions";
import { LeadEditDialog } from "./LeadEditDialog";
import { LeadFilters, type FilterState } from "./LeadFilters";
import { useLeadRealtime } from "../hooks/useLeadRealtime";
import type { LeadWithRelations, LeadRow } from "../types/lead.types";

interface Props {
  leads: LeadWithRelations[];
  permissions: string[];
  statuses: { id: string; name: string; slug: string; color: string }[];
  sources: { id: string; name: string; slug: string }[];
  users?: { id: string; full_name: string }[];
  companies?: { id: string; name: string }[];
}

export function LeadTable({ leads, permissions, statuses, sources, users, companies }: Props) {
  const [rows, setRows] = useState(leads);
  const [editLead, setEditLead] = useState<LeadWithRelations | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    statusId: "",
    sourceId: "",
    assignedTo: "",
  });

  const canUpdate = permissions.includes("lead:update") || permissions.includes("lead:update:own");
  const canDelete = permissions.includes("lead:delete");

  // Sync local state when server component passes new leads (after router.refresh())
  // Always accept the fresh server data — this handles adds, removes, AND value changes
  useEffect(() => {
    setRows(leads);
  }, [leads]);

  // Realtime subscription — auto-updates the table
  useLeadRealtime({
    onInsert: useCallback(
      (lead: LeadRow) => setRows((prev) => [lead as unknown as LeadWithRelations, ...prev]),
      []
    ),
    onUpdate: useCallback(
      (lead: LeadRow) =>
        setRows((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, ...lead } : l))
        ),
      []
    ),
    onDelete: useCallback(
      (old: Partial<LeadRow>) => setRows((prev) => prev.filter((l) => l.id !== old.id)),
      []
    ),
  });

  // Filter rows
  const filteredRows = useMemo(() => {
    return rows.filter((lead) => {
      // Text search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          lead.name.toLowerCase().includes(q) ||
          (lead.email?.toLowerCase().includes(q) ?? false) ||
          (lead.company?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      // Status filter
      if (filters.statusId && lead.status_id !== filters.statusId) return false;
      // Source filter
      if (filters.sourceId && lead.source_id !== filters.sourceId) return false;
      // Assigned To filter
      if (filters.assignedTo) {
        if (filters.assignedTo === "__unassigned__") {
          if (lead.assigned_to) return false;
        } else if (lead.assigned_to !== filters.assignedTo) {
          return false;
        }
      }
      return true;
    });
  }, [rows, filters]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this lead?")) return;
    try {
      await deleteLeadAction(id);
      setRows((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <>
      <LeadFilters
        statuses={statuses}
        sources={sources}
        users={users}
        onFilterChange={setFilters}
      />

      {filteredRows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">
            {rows.length === 0
              ? "No leads yet. Create your first lead to get started."
              : "No leads match your filters."}
          </p>
        </div>
      ) : (
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Company</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Source</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Assigned To</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-gray-800/30"
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  <a
                    href={`/leads/${lead.id}`}
                    className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                  >
                    {lead.name}
                  </a>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {lead.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {lead.company ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                    )}
                    style={{
                      backgroundColor: (lead.lead_statuses?.color ?? "#6b7280") + "20",
                      color: lead.lead_statuses?.color ?? "#6b7280",
                    }}
                  >
                    {lead.lead_statuses?.name ?? "Unknown"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {lead.lead_sources?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {lead.assigned_to_profile?.full_name ?? "Unassigned"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/leads/${lead.id}`}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-green-600 dark:hover:bg-gray-800"
                      title="View"
                    >
                      <Eye size={16} />
                    </a>
                    {canUpdate && (
                      <button
                        onClick={() => setEditLead(lead)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {editLead && (
        <LeadEditDialog
          lead={editLead}
          statuses={statuses}
          sources={sources}
          users={users}
          companies={companies}
          onClose={() => setEditLead(null)}
        />
      )}
    </>
  );
}
