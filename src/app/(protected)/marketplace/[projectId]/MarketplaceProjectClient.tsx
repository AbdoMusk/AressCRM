"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import {
  ArrowLeft,
  Calendar,
  User,
  DollarSign,
  Send,
  Check,
  X,
  Clock,
  FileText,
  Users,
  Briefcase,
  ExternalLink,
  Store,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  submitProposalAction,
  acceptProposalAction,
  rejectProposalAction,
} from "@/modules/engine/actions/marketplace.actions";
import type { MarketplaceProject, ProposalWithMeta } from "@/modules/engine/services/marketplace.service";
import type { ModuleSchema } from "@/modules/engine/types/module.types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProposalTypeModule {
  moduleId: string;
  moduleName: string;
  displayName: string;
  required: boolean;
  schema: ModuleSchema;
}

interface Props {
  project: MarketplaceProject;
  proposals: ProposalWithMeta[];
  userProposal: ProposalWithMeta | null;
  isOwner: boolean;
  proposalTypeModules: ProposalTypeModule[];
  currentUserId: string;
  permissions: string[];
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function MarketplaceProjectClient({
  project,
  proposals,
  userProposal,
  isOwner,
  proposalTypeModules,
  currentUserId,
  permissions,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "proposals" | "submit">(
    isOwner ? "proposals" : "overview"
  );

  const canCreate = permissions.includes("object:create");

  return (
    <div className="flex h-full flex-col">
      {/* ------- Header ------- */}
      <div className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/marketplace")}
            className="mt-1 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold text-gray-900 dark:text-white">
                {project.displayName}
              </h1>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:ring-indigo-800">
                {project.object_type?.display_name ?? "Project"}
              </span>
              {isOwner && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800">
                  Your Project
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                Listed {new Date(project.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <User size={12} />
                {project.ownerName}
              </span>
              <span className="flex items-center gap-1">
                <Users size={12} />
                {project.proposalCount} proposal{project.proposalCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* CTA */}
          {!isOwner && canCreate && !userProposal && proposalTypeModules.length > 0 && (
            <button
              onClick={() => setActiveTab("submit")}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-purple-700 hover:shadow-md"
            >
              <Send size={14} />
              Submit Proposal
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-1">
          {(
            [
              { key: "overview" as const, label: "Overview" },
              { key: "proposals" as const, label: `Proposals (${proposals.length})` },
              ...(canCreate && !isOwner && !userProposal && proposalTypeModules.length > 0
                ? [{ key: "submit" as const, label: "Submit Proposal" }]
                : []),
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                "rounded-t-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ------- Content ------- */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "overview" && <ProjectOverview project={project} />}
        {activeTab === "proposals" && (
          <ProposalsList
            proposals={proposals}
            isOwner={isOwner}
            projectId={project.id}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === "submit" && (
          <ProposalForm
            projectId={project.id}
            modules={proposalTypeModules}
            onSubmitted={() => {
              router.refresh();
              setActiveTab("proposals");
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Project Overview                                                   */
/* ------------------------------------------------------------------ */

function ProjectOverview({ project }: { project: MarketplaceProject }) {
  // Separate public_project module from others for display
  const displayModules = project.modules.filter((m) => m.moduleName !== "public_project");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Quick stats bar */}
      <QuickStats project={project} />

      {/* Module data cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {displayModules.map((mod) => (
          <div
            key={mod.moduleId}
            className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {mod.icon && <span>{mod.icon}</span>}
              {mod.displayName}
            </h3>
            {mod.schema.fields.length > 0 ? (
              <dl className="space-y-2.5">
                {mod.schema.fields.map((field) => {
                  const value = mod.data[field.key];
                  return (
                    <div key={field.key} className="flex items-baseline gap-3">
                      <dt className="w-32 flex-shrink-0 text-xs font-medium text-gray-400">
                        {field.label}
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-white">
                        {formatValue(value, field.type)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            ) : (
              <p className="text-xs text-gray-400">No fields defined.</p>
            )}
          </div>
        ))}
      </div>

      {displayModules.length === 0 && (
        <p className="text-center text-sm text-gray-400">No additional details available.</p>
      )}
    </div>
  );
}

function QuickStats({ project }: { project: MarketplaceProject }) {
  const monetary = project.modules.find((m) => m.moduleName === "monetary");
  const amount = monetary?.data?.amount ?? monetary?.data?.value ?? monetary?.data?.budget;
  const stage = project.modules.find(
    (m) => m.moduleName === "stage" || m.moduleName === "public_project"
  );
  const status = stage?.data?.status ?? stage?.data?.stage;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        icon={<Users size={16} />}
        label="Proposals"
        value={String(project.proposalCount)}
        color="indigo"
      />
      <StatCard
        icon={<User size={16} />}
        label="Owner"
        value={project.ownerName}
        color="purple"
      />
      {amount != null && (
        <StatCard
          icon={<DollarSign size={16} />}
          label="Budget"
          value={Number(amount).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          })}
          color="emerald"
        />
      )}
      {status != null && (
        <StatCard
          icon={<Briefcase size={16} />}
          label="Status"
          value={String(status)}
          color="amber"
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "indigo" | "purple" | "emerald" | "amber";
}) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className={clsx("mb-2 inline-flex rounded-lg p-2", colors[color])}>{icon}</div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Proposals List                                                     */
/* ------------------------------------------------------------------ */

function ProposalsList({
  proposals,
  isOwner,
  projectId,
  currentUserId,
}: {
  proposals: ProposalWithMeta[];
  isOwner: boolean;
  projectId: string;
  currentUserId: string;
}) {
  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <FileText size={24} className="text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
          No proposals yet
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          {isOwner
            ? "Proposals submitted by other users will appear here."
            : "Be the first to submit a proposal for this project!"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {proposals.map((proposal) => (
        <ProposalCard
          key={proposal.id}
          proposal={proposal}
          isOwner={isOwner}
          projectId={projectId}
          isMine={proposal.owner_id === currentUserId || proposal.created_by === currentUserId}
        />
      ))}
    </div>
  );
}

function ProposalCard({
  proposal,
  isOwner,
  projectId,
  isMine,
}: {
  proposal: ProposalWithMeta;
  isOwner: boolean;
  projectId: string;
  isMine: boolean;
}) {
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const statusColors: Record<string, string> = {
    pending:
      "bg-yellow-50 text-yellow-700 ring-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:ring-yellow-800",
    accepted:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800",
    rejected:
      "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-800",
  };

  const handleAccept = useCallback(async () => {
    if (!confirm("Accept this proposal? A deal will be created automatically.")) return;
    setLoading("accept");
    const result = await acceptProposalAction(proposal.id, projectId);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error);
      setLoading(null);
    }
  }, [proposal.id, projectId, router]);

  const handleReject = useCallback(async () => {
    if (!confirm("Reject this proposal?")) return;
    setLoading("reject");
    const result = await rejectProposalAction(proposal.id, projectId);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error);
      setLoading(null);
    }
  }, [proposal.id, projectId, router]);

  // Filter out internal modules for display
  const displayModules = proposal.modules.filter(
    (m) => m.moduleName !== "public_project" && m.moduleName !== "proposal_status"
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white transition-all dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-5 py-4"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
          {proposal.proposerName.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
              {proposal.displayName}
            </span>
            {isMine && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                Yours
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            by {proposal.proposerName} · {new Date(proposal.created_at).toLocaleDateString()}
          </p>
        </div>

        <span
          className={clsx(
            "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1",
            statusColors[proposal.status] ?? statusColors.pending
          )}
        >
          {proposal.status}
        </span>

        {/* Actions for owner */}
        {isOwner && proposal.status === "pending" && (
          <div className="ml-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleAccept}
              disabled={loading !== null}
              className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              <Check size={12} />
              {loading === "accept" ? "Accepting…" : "Accept"}
            </button>
            <button
              onClick={handleReject}
              disabled={loading !== null}
              className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <X size={12} />
              {loading === "reject" ? "Rejecting…" : "Reject"}
            </button>
          </div>
        )}

        {/* Link to record for viewing details */}
        <Link
          href={`/record/${proposal.id}`}
          onClick={(e) => e.stopPropagation()}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Open record"
        >
          <ExternalLink size={14} />
        </Link>
      </div>

      {/* Expanded module data */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {displayModules.map((mod) => (
              <div key={mod.moduleId}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {mod.displayName}
                </h4>
                {mod.schema.fields.length > 0 ? (
                  <dl className="space-y-1.5">
                    {mod.schema.fields.map((field) => (
                      <div key={field.key} className="flex items-baseline gap-2">
                        <dt className="w-28 flex-shrink-0 text-xs text-gray-400">{field.label}</dt>
                        <dd className="text-sm text-gray-800 dark:text-gray-200">
                          {formatValue(mod.data[field.key], field.type)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-xs text-gray-400">No fields.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Proposal Submission Form                                           */
/* ------------------------------------------------------------------ */

function ProposalForm({
  projectId,
  modules,
  onSubmitted,
}: {
  projectId: string;
  modules: ProposalTypeModule[];
  onSubmitted: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, Record<string, unknown>>>(() => {
    const init: Record<string, Record<string, unknown>> = {};
    for (const mod of modules) {
      init[mod.moduleName] = {};
      for (const field of mod.schema.fields) {
        if (field.default != null) init[mod.moduleName][field.key] = field.default;
        else if (field.type === "boolean") init[mod.moduleName][field.key] = false;
        else init[mod.moduleName][field.key] = "";
      }
    }
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (moduleName: string, fieldKey: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [moduleName]: { ...prev[moduleName], [fieldKey]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await submitProposalAction(projectId, formData);
    if (result.success) {
      onSubmitted();
    } else {
      setError(result.error ?? "Failed to submit proposal");
      setSubmitting(false);
    }
  };

  if (modules.length === 0) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <p className="text-sm text-gray-400">
          No proposal object type configured. Ask an administrator to create a
          &quot;proposal&quot; object type in the Registry.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          Fill in the details below to submit your proposal. The project owner
          will review it and can accept or reject.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {modules.map((mod) => (
        <fieldset
          key={mod.moduleId}
          className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
        >
          <legend className="px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {mod.displayName}
            {mod.required && <span className="ml-1 text-red-400">*</span>}
          </legend>

          <div className="mt-2 space-y-4">
            {mod.schema.fields.map((field) => (
              <DynamicField
                key={field.key}
                field={field}
                value={formData[mod.moduleName]?.[field.key] ?? ""}
                onChange={(val) => handleFieldChange(mod.moduleName, field.key, val)}
              />
            ))}
            {mod.schema.fields.length === 0 && (
              <p className="text-xs text-gray-400">No fields defined for this module.</p>
            )}
          </div>
        </fieldset>
      ))}

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-purple-700 hover:shadow-md disabled:opacity-50"
        >
          <Send size={14} />
          {submitting ? "Submitting…" : "Submit Proposal"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Dynamic Field Renderer                                             */
/* ------------------------------------------------------------------ */

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: { key: string; type: string; label: string; required?: boolean; options?: { value: string; label: string }[] };
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const baseInput =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40";

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-400">*</span>}
      </span>

      {field.type === "textarea" ? (
        <textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          rows={3}
          className={baseInput}
        />
      ) : field.type === "boolean" ? (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-400"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">{field.label}</span>
        </div>
      ) : field.type === "select" ? (
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={baseInput}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === "number" ? (
        <input
          type="number"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
          required={field.required}
          className={baseInput}
        />
      ) : field.type === "date" ? (
        <input
          type="date"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={baseInput}
        />
      ) : field.type === "datetime" ? (
        <input
          type="datetime-local"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={baseInput}
        />
      ) : field.type === "email" ? (
        <input
          type="email"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          className={baseInput}
        />
      ) : field.type === "url" ? (
        <input
          type="url"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder="https://…"
          className={baseInput}
        />
      ) : field.type === "phone" ? (
        <input
          type="tel"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          className={baseInput}
        />
      ) : (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          className={baseInput}
        />
      )}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatValue(value: unknown, type: string): string {
  if (value == null || value === "") return "—";
  if (type === "boolean") return value ? "Yes" : "No";
  if (type === "date")
    try {
      return new Date(String(value)).toLocaleDateString();
    } catch {
      return String(value);
    }
  if (type === "datetime")
    try {
      return new Date(String(value)).toLocaleString();
    } catch {
      return String(value);
    }
  if (type === "number") return Number(value).toLocaleString();
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
