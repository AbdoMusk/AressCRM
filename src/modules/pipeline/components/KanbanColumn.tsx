"use client";

import { useDroppable } from "@dnd-kit/core";
import { LeadCard } from "./LeadCard";
import { clsx } from "clsx";

interface StatusColumn {
  id: string;
  name: string;
  color: string;
}

interface LeadItem {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  status_id: string;
  lead_sources: { name: string; slug: string } | null;
  [key: string]: unknown;
}

interface Props {
  status: StatusColumn;
  leads: LeadItem[];
}

export function KanbanColumn({ status, leads }: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: status.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex w-72 shrink-0 flex-col rounded-xl border bg-gray-50 transition-colors dark:bg-gray-900",
        isOver
          ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30"
          : "border-gray-200 dark:border-gray-800"
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-gray-200 p-3 dark:border-gray-800">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {status.name}
        </span>
        <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-400">
            Drop leads here
          </div>
        )}
      </div>
    </div>
  );
}
