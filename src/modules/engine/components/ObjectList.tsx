"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tw } from "./DynamicField";
import { deleteObjectAction } from "@/modules/engine/actions/object.actions";
import type { ObjectWithModules } from "@/modules/engine/types/object.types";
import type { ObjectTypeWithModules } from "@/modules/engine/types/object.types";
import { Plus, Filter, Trash2, Eye, ChevronDown } from "lucide-react";

interface Props {
  objects: ObjectWithModules[];
  objectTypes: ObjectTypeWithModules[];
  /** Currently selected object type filter (name) */
  selectedType?: string;
}

export function ObjectList({
  objects,
  objectTypes,
  selectedType,
}: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this object?")) return;
    setDeletingId(id);
    setError(null);
    try {
      const result = await deleteObjectAction(id);
      if (!result.success) {
        setError(result.error ?? "Failed to delete");
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Objects
          </h2>

          {/* Type filter */}
          {objectTypes.length > 0 && (
            <div className="relative">
              <select
                value={selectedType ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const url = val ? `/objects?type=${val}` : "/objects";
                  router.push(url);
                }}
                className={`${tw.input} w-auto pr-8`}
              >
                <option value="">All types</option>
                {objectTypes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.display_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <Link href="/objects/new" className={tw.btnPrimary}>
          <Plus size={14} className="mr-1 inline" />
          New Object
        </Link>
      </div>

      {error && <div className={tw.error}>{error}</div>}

      {/* List */}
      {objects.length === 0 ? (
        <div className={tw.card}>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            No objects found.{" "}
            <Link href="/objects/new" className="text-blue-600 underline">
              Create one
            </Link>
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                  Modules
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {objects.map((obj) => (
                <tr
                  key={obj.id}
                  className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/objects/${obj.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {obj.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {obj.object_type?.display_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {obj.modules.map((m) => (
                        <span
                          key={m.moduleId}
                          className={`${tw.badge} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`}
                        >
                          {m.displayName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(obj.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/objects/${obj.id}`}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                        title="View"
                      >
                        <Eye size={14} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(obj.id)}
                        disabled={deletingId === obj.id}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
