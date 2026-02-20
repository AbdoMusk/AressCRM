"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldOff, Edit, Save, X } from "lucide-react";
import {
  assignRoleAction,
  revokeRoleAction,
  updateUserProfileAction,
} from "../actions/user.actions";
import type { UserWithRoles } from "../types/user.types";

interface Props {
  initialUsers: UserWithRoles[];
  allRoles: { id: string; name: string }[];
  currentUserId: string;
}

export function UserManager({ initialUsers, allRoles, currentUserId }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync with server data after router.refresh()
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  async function handleAssignRole(userId: string, roleId: string) {
    setError(null);
    setLoading(userId);
    try {
      const result = await assignRoleAction(userId, roleId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const role = allRoles.find((r) => r.id === roleId);
      if (role) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, roles: [...u.roles, { id: role.id, name: role.name }] }
              : u
          )
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign role");
    } finally {
      setLoading(null);
    }
  }

  async function handleRevokeRole(userId: string, roleId: string) {
    setError(null);
    setLoading(userId);
    try {
      const result = await revokeRoleAction(userId, roleId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, roles: u.roles.filter((r) => r.id !== roleId) }
            : u
        )
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke role");
    } finally {
      setLoading(null);
    }
  }

  async function handleUpdateName(userId: string) {
    if (!editName.trim()) return;
    setError(null);
    setLoading(userId);
    try {
      const result = await updateUserProfileAction(userId, { full_name: editName.trim() });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, full_name: editName.trim() } : u
        )
      );
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                User
              </th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Email
              </th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Roles
              </th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Joined
              </th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              const userRoleIds = new Set(user.roles.map((r) => r.id));
              const assignableRoles = allRoles.filter(
                (r) => !userRoleIds.has(r.id)
              );

              return (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          placeholder="Full name"
                        />
                        <button
                          onClick={() => handleUpdateName(user.id)}
                          disabled={loading === user.id}
                          className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {user.full_name}
                        </span>
                        {isCurrentUser && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            You
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setEditingId(user.id);
                            setEditName(user.full_name);
                          }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                          title="Edit name"
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {user.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {user.roles.length === 0 && (
                        <span className="text-xs text-gray-400">No roles</span>
                      )}
                      {user.roles.map((role) => (
                        <span
                          key={role.id}
                          className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                        >
                          {role.name}
                          {!isCurrentUser && (
                            <button
                              onClick={() =>
                                handleRevokeRole(user.id, role.id)
                              }
                              disabled={loading === user.id}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-900"
                              title={`Remove ${role.name} role`}
                            >
                              <ShieldOff size={10} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {!isCurrentUser && assignableRoles.length > 0 && (
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value)
                              handleAssignRole(user.id, e.target.value);
                            e.target.value = "";
                          }}
                          disabled={loading === user.id}
                        >
                          <option value="" disabled>
                            + Assign role
                          </option>
                          {assignableRoles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">
            No users found.
          </p>
        </div>
      )}
    </div>
  );
}
