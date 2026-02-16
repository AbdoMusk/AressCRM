"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import {
  createStatusAction,
  updateStatusAction,
  deleteStatusAction,
  reorderStatusesAction,
} from "../actions/status.actions";
import type { LeadStatusRow, LeadStatusInsert, LeadStatusUpdate } from "../types/settings.types";

interface Props {
  initialStatuses: LeadStatusRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function StatusManager({
  initialStatuses,
  canCreate,
  canUpdate,
  canDelete,
}: Props) {
  const router = useRouter();
  const [statuses, setStatuses] = useState(initialStatuses);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Sync with server data after router.refresh()
  useEffect(() => {
    setStatuses(initialStatuses);
  }, [initialStatuses]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formColor, setFormColor] = useState("#6b7280");
  const [formIsWin, setFormIsWin] = useState(false);
  const [formIsLoss, setFormIsLoss] = useState(false);

  function resetForm() {
    setFormName("");
    setFormSlug("");
    setFormColor("#6b7280");
    setFormIsWin(false);
    setFormIsLoss(false);
  }

  function startEdit(status: LeadStatusRow) {
    setEditingId(status.id);
    setFormName(status.name);
    setFormSlug(status.slug);
    setFormColor(status.color);
    setFormIsWin(status.is_win);
    setFormIsLoss(status.is_loss);
    setShowCreateForm(false);
  }

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      const input: LeadStatusInsert = {
        name: formName,
        slug: formSlug,
        color: formColor,
        position: statuses.length,
        is_win: formIsWin,
        is_loss: formIsLoss,
      };
      const created = await createStatusAction(input);
      setStatuses((prev) => [...prev, created]);
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
      const input: LeadStatusUpdate = {
        name: formName,
        slug: formSlug,
        color: formColor,
        is_win: formIsWin,
        is_loss: formIsLoss,
      };
      const updated = await updateStatusAction(id, input);
      setStatuses((prev) => prev.map((s) => (s.id === id ? updated : s)));
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
    if (!confirm("Delete this status?")) return;
    setError(null);
    try {
      await deleteStatusAction(id);
      setStatuses((prev) => prev.filter((s) => s.id !== id));
      await router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function moveStatus(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= statuses.length) return;
    const reordered = [...statuses];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setStatuses(reordered);
    await reorderStatusesAction(reordered.map((s) => s.id));
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
        {statuses.map((status, index) => (
          <div
            key={status.id}
            className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800"
          >
            {canUpdate && (
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveStatus(index, -1)}
                  disabled={index === 0}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-30 dark:text-gray-600"
                >
                  <GripVertical size={14} />
                </button>
              </div>
            )}

            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: status.color }}
            />

            {editingId === status.id ? (
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
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border-0"
                />
                <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={formIsWin}
                    onChange={(e) => setFormIsWin(e.target.checked)}
                  />
                  Win
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={formIsLoss}
                    onChange={(e) => setFormIsLoss(e.target.checked)}
                  />
                  Loss
                </label>
                <button
                  onClick={() => handleUpdate(status.id)}
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
                    {status.name}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">{status.slug}</span>
                  {status.is_win && (
                    <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                      WIN
                    </span>
                  )}
                  {status.is_loss && (
                    <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                      LOSS
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {canUpdate && (
                    <button
                      onClick={() => startEdit(status)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                    >
                      <Edit size={14} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(status.id)}
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

      {/* Create form */}
      {showCreateForm ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Status name"
          />
          <input
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="slug"
          />
          <input
            type="color"
            value={formColor}
            onChange={(e) => setFormColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border-0"
          />
          <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={formIsWin}
              onChange={(e) => setFormIsWin(e.target.checked)}
            />
            Win
          </label>
          <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={formIsLoss}
              onChange={(e) => setFormIsLoss(e.target.checked)}
            />
            Loss
          </label>
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
            Add Status
          </button>
        )
      )}
    </div>
  );
}
