"use client";

import { useState, useMemo } from "react";
import { Building2, Search } from "lucide-react";
import type { LeadWithRelations } from "@/modules/leads/types/lead.types";

interface Props {
  leads: LeadWithRelations[];
  statuses: { id: string; name: string; color: string }[];
}

export function CompanyList({ leads, statuses }: Props) {
  const [search, setSearch] = useState("");

  // Aggregate companies from leads
  const companies = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        leadCount: number;
        leads: LeadWithRelations[];
        statusBreakdown: Record<string, number>;
      }
    >();

    leads.forEach((lead) => {
      const company = lead.company?.trim() || "No Company";
      if (!map.has(company)) {
        map.set(company, { name: company, leadCount: 0, leads: [], statusBreakdown: {} });
      }
      const entry = map.get(company)!;
      entry.leadCount++;
      entry.leads.push(lead);
      const statusName = lead.lead_statuses?.name ?? "Unknown";
      entry.statusBreakdown[statusName] = (entry.statusBreakdown[statusName] || 0) + 1;
    });

    return Array.from(map.values()).sort((a, b) => b.leadCount - a.leadCount);
  }, [leads]);

  const filtered = useMemo(() => {
    if (!search) return companies;
    const q = search.toLowerCase();
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, search]);

  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Companies</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {companies.filter((c) => c.name !== "No Company").length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Leads</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{leads.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Leads per Company</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {companies.length > 0
              ? (leads.length / companies.filter((c) => c.name !== "No Company").length || 0).toFixed(1)
              : "0"}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Company cards */}
      <div className="space-y-3">
        {filtered.map((company) => (
          <div
            key={company.name}
            className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          >
            <button
              onClick={() =>
                setExpandedCompany(
                  expandedCompany === company.name ? null : company.name
                )
              }
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Building2 size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {company.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {company.leadCount} lead(s)
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(company.statusBreakdown).map(([status, count]) => {
                  const statusObj = statuses.find((s) => s.name === status);
                  return (
                    <span
                      key={status}
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: (statusObj?.color ?? "#6b7280") + "20",
                        color: statusObj?.color ?? "#6b7280",
                      }}
                    >
                      {status}: {count}
                    </span>
                  );
                })}
              </div>
            </button>

            {expandedCompany === company.name && (
              <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                      <th className="pb-2">Lead Name</th>
                      <th className="pb-2">Email</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Source</th>
                      <th className="pb-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.leads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-t border-gray-100 dark:border-gray-800/50"
                      >
                        <td className="py-2 font-medium text-gray-900 dark:text-white">
                          {lead.name}
                        </td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">
                          {lead.email ?? "—"}
                        </td>
                        <td className="py-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor:
                                (lead.lead_statuses?.color ?? "#6b7280") + "20",
                              color: lead.lead_statuses?.color ?? "#6b7280",
                            }}
                          >
                            {lead.lead_statuses?.name ?? "Unknown"}
                          </span>
                        </td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">
                          {lead.lead_sources?.name ?? "—"}
                        </td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400">
              No companies found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
