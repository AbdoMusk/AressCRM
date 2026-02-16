"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { LeadForm } from "./LeadForm";

interface Props {
  statuses: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  users?: { id: string; full_name: string }[];
  companies?: { id: string; name: string }[];
}

export function LeadFormDialog({ statuses, sources, users, companies }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <Plus size={16} />
        New Lead
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Create Lead
            </h2>
            <LeadForm
              statuses={statuses}
              sources={sources}
              users={users}
              companies={companies}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
