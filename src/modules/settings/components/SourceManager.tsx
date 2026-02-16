"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import {
  createSourceAction,
  updateSourceAction,
  deleteSourceAction,
  reorderSourcesAction,
} from "../actions/source.actions";
import type { LeadSourceRow, LeadSourceInsert, LeadSourceUpdate } from "../types/settings.types";

interface Props {
  initialSources: LeadSourceRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function SourceManager({
  initialSources,
  canCreate,
  canUpdate,
  canDelete,
}: Props) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Sync with server data after router.refresh()
  useEffect(() => {
    setSources(initialSources);
  }, [initialSources]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formIcon, setFormIcon] = useState("");

  function resetForm() {
    setFormName("");
    setFormSlug("");
    setFormIcon("");
  }

  function startEdit(source: LeadSourceRow) {
    setEditingId(source.id);
    setFormName(source.name);
    setFormSlug(source.slug);
    setFormIcon(source.icon ?? "");
    setShowCreateForm(false);
  }

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      const input: LeadSourceInsert = {
        name: formName,
        slug: formSlug,
        icon: formIcon || null,
        position: sources.length,
      };
      const created = await createSourceAction(input);
      setSources((prev) => [...prev, created]);
      setShowCreateForm(false);
      resetForm();
      await router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string) {
    setError(null);
    setLoading(true);
    try {
      const input: LeadSourceUpdate = {
        name: formName,
        slug: formSlug,
        icon: formIcon || null,
      };
      const updated = await updateSourceAction(id, input);
      setSources((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setEditingId(null);
      resetForm();
      await router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this source?")) return;
    setError(null);
    try {
      await deleteSourceAction(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
      await router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function moveSource(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sources.length) return;
    const reordered = [...sources];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setSources(reordered);
    await reorderSourcesAction(reordered.map((s) => s.id));
    await router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {sources.map((source, index) => (
          <div
            key={source.id}
            className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800"
          >
            {canUpdate && (
              <button
                onClick={() => moveSource(index, -1)}
                disabled={index === 0}
                className="text-gray-300 hover:text-gray-500 disabled:opacity-30 dark:text-gray-600"
              >
                <GripVertical size={14} />
              </button>
            )}

            {editingId === source.id ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Name"
                />
                <input
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="slug"
                />
                <input
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="icon (optional)"
                />
                <button
                  onClick={() => handleUpdate(source.id)}
                  disabled={loading}
                  className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    resetForm();
                  }}
                  className="rounded border px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {source.name}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">{source.slug}</span>
                  {source.icon && (
                    <span className="ml-2 text-xs text-gray-400">({source.icon})</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {canUpdate && (
                    <button
                      onClick={() => startEdit(source)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                    >
                      <Edit size={14} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {showCreateForm ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Source name"
          />
          <input
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="slug"
          />
          <input
            value={formIcon}
            onChange={(e) => setFormIcon(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="icon (optional)"
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Create
          </button>
          <button
            onClick={() => {
              setShowCreateForm(false);
              resetForm();
            }}
            className="rounded border px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      ) : (
        canCreate && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateForm(true);
              setEditingId(null);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Source
          </button>
        )
      )}
    </div>
  );
}
