"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit, Save, X, ChevronDown, ChevronRight } from "lucide-react";
import {
  createRoleAction,
  updateRoleAction,
  updateRolePermissionsAction,
  deleteRoleAction,
} from "../actions/role.actions";
import type { RoleWithPermissions, PermissionRow } from "@/modules/users/types/user.types";

interface Props {
  initialRoles: RoleWithPermissions[];
  allPermissions: PermissionRow[];
}

/** Group permissions by prefix (e.g., "lead", "settings", "dashboard") */
function groupPermissions(perms: PermissionRow[]): Record<string, PermissionRow[]> {
  const groups: Record<string, PermissionRow[]> = {};
  perms.forEach((p) => {
    const parts = p.action.split(":");
    const group = parts[0] === "settings" ? `settings:${parts[1]}` : parts[0];
    if (!groups[group]) groups[group] = [];
    groups[group].push(p);
  });
  return groups;
}

export function RoleManager({ initialRoles, allPermissions }: Props) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with server data after router.refresh()
  useEffect(() => {
    setRoles(initialRoles);
  }, [initialRoles]);

  const permGroups = groupPermissions(allPermissions);

  function togglePerm(permId: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await createRoleAction(
        newName.trim(),
        newDesc.trim() || null,
        Array.from(selectedPerms)
      );
      // Refresh server data
      await router.refresh();
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setSelectedPerms(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateName(roleId: string) {
    setError(null);
    setLoading(true);
    try {
      await updateRoleAction(roleId, {
        name: editName.trim(),
        description: editDesc.trim() || null,
      });
      setRoles((prev) =>
        prev.map((r) =>
          r.id === roleId
            ? { ...r, name: editName.trim(), description: editDesc.trim() || null }
            : r
        )
      );
      setEditingId(null);
      await router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePermissions(roleId: string) {
    setError(null);
    setLoading(true);
    try {
      await updateRolePermissionsAction(roleId, Array.from(selectedPerms));
      const updatedPerms = allPermissions.filter((p) => selectedPerms.has(p.id));
      setRoles((prev) =>
        prev.map((r) =>
          r.id === roleId ? { ...r, permissions: updatedPerms } : r
        )
      );
      await router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(roleId: string) {
    const role = roles.find((r) => r.id === roleId);
    if (!confirm(`Delete role "${role?.name}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteRoleAction(roleId);
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      await router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function startExpand(role: RoleWithPermissions) {
    if (expandedRole === role.id) {
      setExpandedRole(null);
      return;
    }
    setExpandedRole(role.id);
    setSelectedPerms(new Set(role.permissions.map((p) => p.id)));
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Roles list */}
      <div className="space-y-3">
        {roles.map((role) => (
          <div
            key={role.id}
            className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          >
            {/* Role header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => startExpand(role)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {expandedRole === role.id ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>

              {editingId === role.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Role name"
                  />
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Description"
                  />
                  <button
                    onClick={() => handleUpdateName(role.id)}
                    disabled={loading}
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save size={14} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {role.name}
                    </span>
                    {role.description && (
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        — {role.description}
                      </span>
                    )}
                    <span className="ml-3 text-xs text-gray-400">
                      {role.permissions.length} permission(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(role.id);
                        setEditName(role.name);
                        setEditDesc(role.description ?? "");
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                      title="Edit role"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                      title="Delete role"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Expanded permissions */}
            {expandedRole === role.id && (
              <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-800">
                <div className="space-y-4">
                  {Object.entries(permGroups).map(([group, perms]) => (
                    <div key={group}>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {group}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((perm) => (
                          <label
                            key={perm.id}
                            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs transition-colors hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-800 dark:has-[:checked]:border-blue-700 dark:has-[:checked]:bg-blue-950"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPerms.has(perm.id)}
                              onChange={() => togglePerm(perm.id)}
                              className="accent-blue-600"
                            />
                            <span className="text-gray-700 dark:text-gray-300">
                              {perm.action}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleUpdatePermissions(role.id)}
                    disabled={loading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save Permissions
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create new role */}
      {showCreate ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Create New Role
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Role name"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="space-y-3">
              {Object.entries(permGroups).map(([group, perms]) => (
                <div key={group}>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {group}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {perms.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs transition-colors hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-800 dark:has-[:checked]:border-blue-700 dark:has-[:checked]:bg-blue-950"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPerms.has(perm.id)}
                          onChange={() => togglePerm(perm.id)}
                          className="accent-blue-600"
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          {perm.action}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                  setNewDesc("");
                  setSelectedPerms(new Set());
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !newName.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creating…" : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setShowCreate(true);
            setSelectedPerms(new Set());
          }}
          className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-800 dark:hover:text-blue-400"
        >
          <Plus size={16} />
          Add New Role
        </button>
      )}
    </div>
  );
}
