"use client";

import { LeadForm } from "./LeadForm";
import type { LeadWithRelations } from "../types/lead.types";

interface Props {
  lead: LeadWithRelations;
  statuses: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  users?: { id: string; full_name: string }[];
  companies?: { id: string; name: string }[];
  onClose: () => void;
}

export function LeadEditDialog({ lead, statuses, sources, users, companies, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Edit Lead
        </h2>
        <LeadForm
          statuses={statuses}
          sources={sources}
          users={users}
          companies={companies}
          initialData={{
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            company_id: lead.company_id,
            status_id: lead.status_id,
            source_id: lead.source_id,
            assigned_to: lead.assigned_to,
            notes: lead.notes,
          }}
          onSuccess={onClose}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
