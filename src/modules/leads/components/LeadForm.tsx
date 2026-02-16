"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createLeadAction, updateLeadAction } from "../actions/lead.actions";
import type { LeadInsert, LeadUpdate } from "../types/lead.types";

interface CompanyOption {
  id: string;
  name: string;
}

interface Props {
  statuses: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  users?: { id: string; full_name: string }[];
  companies?: CompanyOption[];
  initialData?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    company_id: string | null;
    status_id: string;
    source_id: string;
    assigned_to: string | null;
    notes: string | null;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function LeadForm({
  statuses,
  sources,
  users,
  companies = [],
  initialData,
  onSuccess,
  onCancel,
}: Props) {
  const router = useRouter();
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [companyText, setCompanyText] = useState(initialData?.company ?? "");
  const [companyId, setCompanyId] = useState(initialData?.company_id ?? "");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const companyRef = useRef<HTMLDivElement>(null);
  const [statusId, setStatusId] = useState(
    initialData?.status_id ?? statuses[0]?.id ?? ""
  );
  const [sourceId, setSourceId] = useState(
    initialData?.source_id ?? sources[0]?.id ?? ""
  );
  const [assignedTo, setAssignedTo] = useState(
    initialData?.assigned_to ?? ""
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  // Filter companies based on input text
  const filteredCompanies = useMemo(() => {
    if (!companyText) return companies;
    const q = companyText.toLowerCase();
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, companyText]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setShowCompanyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        name,
        email: email || null,
        phone: phone || null,
        company: companyText || null,
        company_id: companyId || null,
        status_id: statusId,
        source_id: sourceId,
        assigned_to: assignedTo || null,
        notes: notes || null,
      };

      if (isEditing) {
        await updateLeadAction(initialData.id, payload as LeadUpdate);
      } else {
        await createLeadAction(payload as LeadInsert);
      }
      
      // IMPORTANT: Wait for server refresh to complete before closing dialog
      // This ensures the new props reach the client component
      await router.refresh();
      
      // Now close the dialog - LeadTable will have received the updated data
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div ref={companyRef} className="relative">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Company
        </label>
        <input
          type="text"
          value={companyText}
          onChange={(e) => {
            setCompanyText(e.target.value);
            setCompanyId("");          // Reset selection when user types
            setShowCompanyDropdown(true);
          }}
          onFocus={() => setShowCompanyDropdown(true)}
          placeholder="Type to search or enter new company…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        {companyId && (
          <span className="absolute right-3 top-[2.1rem] text-xs text-green-600 dark:text-green-400">
            ✓ Linked
          </span>
        )}
        {showCompanyDropdown && filteredCompanies.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {filteredCompanies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCompanyText(c.name);
                  setCompanyId(c.id);
                  setShowCompanyDropdown(false);
                }}
                className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <span className="text-gray-900 dark:text-white">{c.name}</span>
              </button>
            ))}
          </div>
        )}
        {showCompanyDropdown && companyText && filteredCompanies.length === 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No existing company found. A new company &quot;{companyText}&quot; will be created.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status *
          </label>
          <select
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Source *
          </label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {users && users.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Assigned To
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? isEditing
              ? "Updating…"
              : "Creating…"
            : isEditing
              ? "Update Lead"
              : "Create Lead"}
        </button>
      </div>
    </form>
  );
}
