"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tw } from "./DynamicField";
import {
  createObjectTypeAction,
  updateObjectTypeAction,
  deleteObjectTypeAction,
} from "@/modules/engine/actions/object-type.actions";
import type { ModuleRowTyped } from "@/modules/engine/types/module.types";
import type {
  ObjectTypeWithModules,
  ObjectTypeCreateInput,
} from "@/modules/engine/types/object.types";
import { Plus, Edit2, Trash2, GripVertical, X } from "lucide-react";

interface Props {
  objectTypes: ObjectTypeWithModules[];
  modules: ModuleRowTyped[];
}

type Mode = "list" | "create" | "edit";

export function ObjectTypeManager({ objectTypes, modules }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [selectedModules, setSelectedModules] = useState<
    { module_id: string; required: boolean; position: number }[]
  >([]);

  function resetForm() {
    setName("");
    setDisplayName("");
    setDescription("");
    setIcon("");
    setColor("#3b82f6");
    setSelectedModules([]);
    setEditingId(null);
    setError(null);
  }

  function startCreate() {
    resetForm();
    setMode("create");
  }

  function startEdit(ot: ObjectTypeWithModules) {
    setName(ot.name);
    setDisplayName(ot.display_name);
    setDescription(ot.description ?? "");
    setIcon(ot.icon ?? "");
    setColor(ot.color ?? "#3b82f6");
    setSelectedModules(
      ot.modules.map((m) => ({
        module_id: m.module_id,
        required: m.required,
        position: m.position,
      }))
    );
    setEditingId(ot.id);
    setMode("edit");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: ObjectTypeCreateInput = {
      name,
      display_name: displayName,
      description: description || undefined,
      icon: icon || undefined,
      color: color || undefined,
      modules: selectedModules,
    };

    try {
      const result =
        mode === "create"
          ? await createObjectTypeAction(payload)
          : await updateObjectTypeAction(editingId!, payload);

      if (!result.success) {
        setError(result.error ?? "Operation failed");
        return;
      }

      resetForm();
      setMode("list");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this object type? This cannot be undone.")) return;
    setError(null);
    try {
      const result = await deleteObjectTypeAction(id);
      if (!result.success) {
        setError(result.error ?? "Failed to delete");
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  // Toggle a module on/off
  function toggleModule(moduleId: string) {
    setSelectedModules((prev) => {
      const exists = prev.find((m) => m.module_id === moduleId);
      if (exists) return prev.filter((m) => m.module_id !== moduleId);
      return [
        ...prev,
        { module_id: moduleId, required: true, position: prev.length },
      ];
    });
  }

  function toggleRequired(moduleId: string) {
    setSelectedModules((prev) =>
      prev.map((m) =>
        m.module_id === moduleId ? { ...m, required: !m.required } : m
      )
    );
  }

  // ── List view ──
  if (mode === "list") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Object Types
          </h2>
          <button type="button" onClick={startCreate} className={tw.btnPrimary}>
            <Plus size={14} className="mr-1 inline" />
            New Type
          </button>
        </div>

        {error && <div className={tw.error}>{error}</div>}

        {objectTypes.length === 0 ? (
          <div className={tw.card}>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              No object types defined yet. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {objectTypes.map((ot) => (
              <div key={ot.id} className={`${tw.card} flex items-center justify-between`}>
                <div>
                  <div className="flex items-center gap-2">
                    {ot.icon && <span>{ot.icon}</span>}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {ot.display_name}
                    </span>
                    <span className="text-xs text-gray-400">{ot.name}</span>
                  </div>
                  {ot.description && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {ot.description}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ot.modules.map((m) => (
                      <span
                        key={m.module_id}
                        className={`${tw.badge} ${
                          m.required
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {m.display_name}
                        {m.required && " *"}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(ot)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ot.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Create / Edit form ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === "create" ? "New Object Type" : "Edit Object Type"}
        </h2>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setMode("list");
          }}
          className={tw.btnSecondary}
        >
          <X size={14} className="mr-1 inline" />
          Cancel
        </button>
      </div>

      {error && <div className={tw.error}>{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={tw.label}>Name (slug)</label>
            <input
              className={tw.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. deal"
              required
            />
          </div>
          <div>
            <label className={tw.label}>Display Name</label>
            <input
              className={tw.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Deal"
              required
            />
          </div>
          <div>
            <label className={tw.label}>Icon</label>
            <input
              className={tw.input}
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Emoji or icon name"
            />
          </div>
          <div>
            <label className={tw.label}>Color</label>
            <input
              type="color"
              className={tw.input}
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={tw.label}>Description</label>
            <textarea
              className={tw.input}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description"
            />
          </div>
        </div>

        {/* Module selection */}
        <div>
          <label className={tw.label}>Modules</label>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Select modules and mark them as required (*) or optional.
          </p>
          <div className="space-y-1">
            {modules.map((mod) => {
              const sel = selectedModules.find(
                (m) => m.module_id === mod.id
              );
              const isSelected = !!sel;
              return (
                <div
                  key={mod.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    isSelected
                      ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
                      : "border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleModule(mod.id)}
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {mod.display_name}
                    </span>
                    <span className="text-xs text-gray-400">{mod.name}</span>
                  </label>
                  {isSelected && (
                    <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={sel!.required}
                        onChange={() => toggleRequired(mod.id)}
                      />
                      Required
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setMode("list");
            }}
            className={tw.btnSecondary}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={tw.btnPrimary}
            disabled={loading || selectedModules.length === 0}
          >
            {loading
              ? "Saving…"
              : mode === "create"
              ? "Create Object Type"
              : "Update Object Type"}
          </button>
        </div>
      </form>
    </div>
  );
}
