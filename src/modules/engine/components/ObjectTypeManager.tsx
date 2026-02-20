"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { tw } from "./DynamicField";
import {
  createObjectTypeAction,
  updateObjectTypeAction,
  deleteObjectTypeAction,
} from "@/modules/engine/actions/object-type.actions";
import { toggleObjectTypeActiveAction } from "@/modules/engine/actions/datamodel.actions";
import type { ModuleRowTyped } from "@/modules/engine/types/module.types";
import type {
  ObjectTypeWithModules,
  ObjectTypeCreateInput,
} from "@/modules/engine/types/object.types";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

// Utility to convert text to snake_case slug
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_");
}

interface Props {
  objectTypes: ObjectTypeWithModules[];
  modules: ModuleRowTyped[];
  onSelectObjectType?: (id: string) => void;
}

type Mode = "list" | "create" | "edit";

export function ObjectTypeManager({ objectTypes, modules, onSelectObjectType }: Props) {
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
  const [slugManuallyModified, setSlugManuallyModified] = useState(false);
  const [selectedModules, setSelectedModules] = useState<
    { module_id: string; required: boolean; position: number }[]
  >([]);

  // Auto-generate slug from displayName
  useEffect(() => {
    if (!slugManuallyModified && displayName && mode === "create") {
      setName(toSlug(displayName));
    }
  }, [displayName, slugManuallyModified, mode]);

  function resetForm() {
    setName("");
    setDisplayName("");
    setDescription("");
    setIcon("");
    setColor("#3b82f6");
    setSelectedModules([]);
    setEditingId(null);
    setError(null);
    setSlugManuallyModified(false);
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
    setSlugManuallyModified(true);
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

  async function handleToggleActive(ot: ObjectTypeWithModules) {
    const currentlyActive = (ot as any).is_active !== false;
    try {
      const result = await toggleObjectTypeActiveAction(ot.id, !currentlyActive);
      if (!result.success) {
        setError(result.error ?? "Failed to toggle");
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle");
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

  // Count fields for an object type
  function countFields(ot: ObjectTypeWithModules): number {
    return ot.modules.reduce((sum, m) => {
      const mod = modules.find((mod) => mod.id === m.module_id);
      return sum + (mod?.schema.fields.length ?? 0);
    }, 0);
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
            New Object
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
            {objectTypes.map((ot) => {
              const isActive = (ot as any).is_active !== false;
              const fieldCount = countFields(ot);
              const relCount = 0; // Relations counted from parent

              return (
                <div
                  key={ot.id}
                  className={clsx(
                    tw.card,
                    "flex items-center justify-between transition-colors",
                    !isActive && "opacity-50",
                    onSelectObjectType && "cursor-pointer hover:border-blue-300 dark:hover:border-blue-800"
                  )}
                  onClick={() => onSelectObjectType?.(ot.id)}
                  role={onSelectObjectType ? "button" : undefined}
                  tabIndex={onSelectObjectType ? 0 : undefined}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                      style={{
                        backgroundColor: `${ot.color ?? "#6B7280"}20`,
                        color: ot.color ?? "#6B7280",
                      }}
                    >
                      {ot.icon || "📦"}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {ot.display_name}
                        </span>
                        <span className="text-xs text-gray-400">{ot.name}</span>
                        {!isActive && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      {ot.description && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {ot.description}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        <span>
                          {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                        </span>
                        <span>
                          {ot.modules.length} module{ot.modules.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Toggle active */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(ot)}
                      className={clsx(
                        "rounded p-1.5 transition-colors",
                        isActive
                          ? "text-green-500 hover:bg-green-50 dark:hover:bg-green-950"
                          : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                      title={isActive ? "Deactivate" : "Activate"}
                    >
                      {isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
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
                    {onSelectObjectType && (
                      <ChevronRight size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>
              );
            })}
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
            <label className={tw.label}>Display Name</label>
            <input
              className={tw.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Deal"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              The user-friendly name for this object type
            </p>
          </div>
          <div>
            <label className={tw.label}>Slug (auto-generated)</label>
            <input
              className={tw.input}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlugManuallyModified(true);
              }}
              placeholder="e.g. deal"
              required
              disabled={mode === "edit"}
            />
            <p className="mt-1 text-xs text-gray-500">
              {mode === "create"
                ? "Generated from display name, or modify as needed"
                : "Slug cannot be changed after creation"}
            </p>
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
            Select modules and mark them as required (*) or optional. Each module
            adds its fields to this object type.
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
                  className={clsx(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                    isSelected
                      ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
                      : "border-gray-200 dark:border-gray-800"
                  )}
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
                    <span className="text-xs text-gray-400">
                      {mod.schema.fields.length} fields
                    </span>
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
