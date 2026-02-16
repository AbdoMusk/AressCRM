"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  User,
  Calendar,
  FileText,
  Clock,
} from "lucide-react";
import { deleteLeadAction } from "../actions/lead.actions";
import { LeadEditDialog } from "./LeadEditDialog";
import type { LeadWithRelations } from "../types/lead.types";

interface Props {
  lead: LeadWithRelations;
  statuses: { id: string; name: string; slug: string; color: string }[];
  sources: { id: string; name: string; slug: string }[];
  users: { id: string; full_name: string }[];
  companies?: { id: string; name: string }[];
  canUpdate: boolean;
  canDelete: boolean;
}

export function LeadDetail({
  lead: initialLead,
  statuses,
  sources,
  users,
  companies,
  canUpdate,
  canDelete,
}: Props) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync lead state when server refreshes with new data
  useEffect(() => {
    setLead(initialLead);
  }, [initialLead]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone."))
      return;
    setDeleting(true);
    try {
      await deleteLeadAction(lead.id);
      router.push("/leads");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const statusColor = lead.lead_statuses?.color ?? "#6b7280";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/leads")}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {lead.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  backgroundColor: statusColor + "20",
                  color: statusColor,
                }}
              >
                {lead.lead_statuses?.name ?? "Unknown"}
              </span>
              {lead.lead_sources?.name && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  via {lead.lead_sources.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUpdate && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Edit size={16} />
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            >
              <Trash2 size={16} />
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Contact Information
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={<Mail size={16} />} label="Email" value={lead.email} />
              <InfoRow icon={<Phone size={16} />} label="Phone" value={lead.phone} />
              <InfoRow icon={<Building2 size={16} />} label="Company" value={lead.company} />
              <InfoRow
                icon={<User size={16} />}
                label="Assigned To"
                value={lead.assigned_to_profile?.full_name ?? "Unassigned"}
              />
            </div>
          </div>

          {/* Notes Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Notes
            </h2>
            {lead.notes ? (
              <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
                {lead.notes}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">No notes added yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Lead Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Status
                </label>
                <div className="mt-1">
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                    style={{
                      backgroundColor: statusColor + "20",
                      color: statusColor,
                    }}
                  >
                    {lead.lead_statuses?.name ?? "Unknown"}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Source
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {lead.lead_sources?.name ?? "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Timeline
            </h2>
            <div className="space-y-3">
              <TimelineRow
                icon={<Calendar size={14} />}
                label="Created"
                value={formatDate(lead.created_at)}
              />
              <TimelineRow
                icon={<Clock size={14} />}
                label="Updated"
                value={formatDate(lead.updated_at)}
              />
              <TimelineRow
                icon={<User size={14} />}
                label="Created By"
                value={lead.created_by_profile?.full_name ?? "Unknown"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {editing && (
        <LeadEditDialog
          lead={lead}
          statuses={statuses}
          sources={sources}
          users={users}
          companies={companies}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-gray-400">{icon}</span>
      <div>
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 dark:text-white">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function TimelineRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400">{icon}</span>
      <div>
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
