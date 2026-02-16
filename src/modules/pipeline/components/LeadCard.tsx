"use client";

import { useDraggable } from "@dnd-kit/core";
import { clsx } from "clsx";
import { GripVertical, Mail, Building2 } from "lucide-react";

interface LeadItem {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  lead_sources: { name: string; slug: string } | null;
  [key: string]: unknown;
}

interface Props {
  lead: LeadItem;
  isDragging?: boolean;
}

export function LeadCard({ lead, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow dark:border-gray-700 dark:bg-gray-800",
        isDragging && "rotate-2 shadow-lg opacity-90"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400"
        >
          <GripVertical size={14} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {lead.name}
          </p>
          {lead.email && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
              <Mail size={10} />
              {lead.email}
            </p>
          )}
          {lead.company && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
              <Building2 size={10} />
              {lead.company}
            </p>
          )}
          {lead.lead_sources && (
            <span className="mt-1.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {lead.lead_sources.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
