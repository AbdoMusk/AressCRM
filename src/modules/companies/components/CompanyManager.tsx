"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, Plus, Pencil, Trash2, Users, X } from "lucide-react";
import type { CompanyWithRelations, CompanyUpdate, CompanyInsert } from "../types/company.types";
import {
  createCompanyAction,
  updateCompanyAction,
  deleteCompanyAction,
  addCompanyMemberAction,
  removeCompanyMemberAction,
} from "../actions/company.actions";

interface CompanyMember {
  company_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: { full_name: string } | null;
}

interface Props {
  companies: CompanyWithRelations[];
  companyMembers: Record<string, CompanyMember[]>;
  users: { id: string; full_name: string }[];
  permissions: Set<string>;
}

export function CompanyManager({ companies: initialCompanies, companyMembers, users, permissions }: Props) {
  const router = useRouter();
  const [companies, setCompanies] = useState(initialCompanies);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CompanyWithRelations | null>(null);
  const [managingMembers, setManagingMembers] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync props
  useEffect(() => { setCompanies(initialCompanies); }, [initialCompanies]);

  const canCreate = permissions.has("company:create");
  const canUpdate = permissions.has("company:update") || permissions.has("company:update:own");
  const canDelete = permissions.has("company:delete");
  const canManageMembers = permissions.has("company:members:manage");

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header + Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        {canCreate && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); setError(null); }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} /> New Company
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {showForm && (
        <CompanyFormDialog
          company={editing}
          users={users}
          onSave={async (data) => {
            setLoading(true);
            setError(null);
            try {
              if (editing) {
                await updateCompanyAction(editing.id, data);
              } else {
                await createCompanyAction(data as CompanyInsert);
              }
              await router.refresh();
              setShowForm(false);
              setEditing(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Operation failed");
            } finally {
              setLoading(false);
            }
          }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          loading={loading}
        />
      )}

      {/* Members management dialog */}
      {managingMembers && (
        <MembersDialog
          companyId={managingMembers}
          companyName={companies.find((c) => c.id === managingMembers)?.name ?? ""}
          members={companyMembers[managingMembers] ?? []}
          users={users}
          onClose={async () => {
            setManagingMembers(null);
            await router.refresh();
          }}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Companies</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{companies.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">With Assigned Users</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {companies.filter((c) => c.assigned_to).length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Industries</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {new Set(companies.map((c) => c.industry).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {/* Company cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <Building2 size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">
            {search ? "No companies match your search" : "No companies yet. Create one to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((company) => (
            <div
              key={company.id}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{company.name}</h3>
                    {company.industry && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{company.industry}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canManageMembers && (
                    <button
                      onClick={() => setManagingMembers(company.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      title="Manage members"
                    >
                      <Users size={16} />
                    </button>
                  )}
                  {canUpdate && (
                    <button
                      onClick={() => { setEditing(company); setShowForm(true); setError(null); }}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this company?")) return;
                        try {
                          await deleteCompanyAction(company.id);
                          await router.refresh();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Delete failed");
                        }
                      }}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {company.website && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Website: </span>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {company.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {company.phone && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Phone: </span>
                    <span className="text-gray-900 dark:text-white">{company.phone}</span>
                  </div>
                )}
                {company.address && (
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Address: </span>
                    <span className="text-gray-900 dark:text-white">{company.address}</span>
                  </div>
                )}
                {company.assigned_to_profile && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Assigned to: </span>
                    <span className="text-gray-900 dark:text-white">
                      {company.assigned_to_profile.full_name}
                    </span>
                  </div>
                )}
              </div>

              {company.notes && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {company.notes}
                </p>
              )}

              {/* Members preview */}
              {(companyMembers[company.id]?.length ?? 0) > 0 && (
                <div className="mt-3 flex items-center gap-1">
                  <Users size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {companyMembers[company.id].length} member(s)
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Company Form Dialog
// ──────────────────────────────────────────────────────────

function CompanyFormDialog({
  company,
  users,
  onSave,
  onCancel,
  loading,
}: {
  company: CompanyWithRelations | null;
  users: { id: string; full_name: string }[];
  onSave: (data: CompanyUpdate) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(company?.name ?? "");
  const [industry, setIndustry] = useState(company?.industry ?? "");
  const [website, setWebsite] = useState(company?.website ?? "");
  const [phone, setPhone] = useState(company?.phone ?? "");
  const [address, setAddress] = useState(company?.address ?? "");
  const [notes, setNotes] = useState(company?.notes ?? "");
  const [assignedTo, setAssignedTo] = useState(company?.assigned_to ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {company ? "Edit Company" : "New Company"}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              name,
              industry: industry || null,
              website: website || null,
              phone: phone || null,
              address: address || null,
              notes: notes || null,
              assigned_to: assignedTo || null,
            });
          }}
          className="space-y-4"
        >
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
                Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
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

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Website
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {users.length > 0 && (
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
                  <option key={u.id} value={u.id}>{u.full_name}</option>
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
              {loading ? "Saving…" : company ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Members Dialog
// ──────────────────────────────────────────────────────────

function MembersDialog({
  companyId,
  companyName,
  members,
  users,
  onClose,
}: {
  companyId: string;
  companyName: string;
  members: CompanyMember[];
  users: { id: string; full_name: string }[];
  onClose: () => void;
}) {
  const [memberList, setMemberList] = useState(members);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberUserIds = new Set(memberList.map((m) => m.user_id));
  const availableUsers = users.filter((u) => !memberUserIds.has(u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Members — {companyName}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Current members */}
        <div className="space-y-2">
          {memberList.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No members assigned yet.
            </p>
          )}
          {memberList.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {m.profiles?.full_name ?? "Unknown"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{m.role}</p>
              </div>
              <button
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    await removeCompanyMemberAction(companyId, m.user_id);
                    setMemberList((prev) => prev.filter((x) => x.user_id !== m.user_id));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Add member */}
        {availableUsers.length > 0 && (
          <div className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Add Member
              </label>
              <select
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select user…</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <button
              onClick={async () => {
                if (!addUserId) return;
                setLoading(true);
                setError(null);
                try {
                  await addCompanyMemberAction(companyId, addUserId, addRole);
                  const user = users.find((u) => u.id === addUserId);
                  setMemberList((prev) => [
                    ...prev,
                    {
                      company_id: companyId,
                      user_id: addUserId,
                      role: addRole,
                      created_at: new Date().toISOString(),
                      profiles: user ? { full_name: user.full_name } : null,
                    },
                  ]);
                  setAddUserId("");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !addUserId}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
