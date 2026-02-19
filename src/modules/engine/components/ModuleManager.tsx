"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tw } from "./DynamicField";
import {
  createModuleAction,
  updateModuleAction,
  deleteModuleAction,
} from "@/modules/engine/actions/module.actions";
import type {
  ModuleRowTyped,
  ModuleFieldDef,
  ModuleFieldType,
  ModuleSchema,
  ModuleCreateInput,
} from "@/modules/engine/types/module.types";
import { Plus, Edit2, Trash2, X, GripVertical } from "lucide-react";

const FIELD_TYPES: ModuleFieldType[] = [
  "text",
  "email",
  "phone",
  "number",
  "date",
  "datetime",
  "textarea",
  "select",
  "multiselect",
  "boolean",
  "url",
];

interface Props {
  modules: ModuleRowTyped[];
}

type Mode = "list" | "create" | "edit";

export function ModuleManager({ modules }: Props) {
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
  const [fields, setFields] = useState<ModuleFieldDef[]>([]);

  function resetForm() {
    setName("");
    setDisplayName("");
    setDescription("");
    setIcon("");
    setFields([]);
    setEditingId(null);
    setError(null);
  }

  function startCreate() {
    resetForm();
    setMode("create");
  }

  function startEdit(mod: ModuleRowTyped) {
    setName(mod.name);
    setDisplayName(mod.display_name);
    setDescription(mod.description ?? "");
    setIcon(mod.icon ?? "");
    setFields([...mod.schema.fields]);
    setEditingId(mod.id);
    setMode("edit");
  }

  function addField() {
    setFields((prev) => [
      ...prev,
      { key: "", type: "text", label: "", required: false },
    ]);
  }

  function updateField(idx: number, partial: Partial<ModuleFieldDef>) {
    setFields((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, ...partial } : f))
    );
  }

  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const schema: ModuleSchema = { fields };
    const payload: ModuleCreateInput = {
      name,
      display_name: displayName,
      description: description || undefined,
      icon: icon || undefined,
      schema,
    };

    try {
      const result =
        mode === "create"
          ? await createModuleAction(payload)
          : await updateModuleAction(editingId!, payload);

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
    if (!confirm("Delete this module? Any objects using it will lose this data."))
      return;
    setError(null);
    try {
      const result = await deleteModuleAction(id);
      if (!result.success) {
        setError(result.error ?? "Failed to delete");
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  // ── List view ──
  if (mode === "list") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Modules
          </h2>
          <button type="button" onClick={startCreate} className={tw.btnPrimary}>
            <Plus size={14} className="mr-1 inline" />
            New Module
          </button>
        </div>

        {error && <div className={tw.error}>{error}</div>}

        {modules.length === 0 ? (
          <div className={tw.card}>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              No modules defined yet. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {modules.map((mod) => (
              <div key={mod.id} className={`${tw.card} flex items-center justify-between`}>
                <div>
                  <div className="flex items-center gap-2">
                    {mod.icon && <span>{mod.icon}</span>}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {mod.display_name}
                    </span>
                    <span className="text-xs text-gray-400">{mod.name}</span>
                  </div>
                  {mod.description && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {mod.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {mod.schema.fields.length} field
                    {mod.schema.fields.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(mod)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(mod.id)}
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
          {mode === "create" ? "New Module" : "Edit Module"}
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
              placeholder="e.g. monetary"
              required
            />
          </div>
          <div>
            <label className={tw.label}>Display Name</label>
            <input
              className={tw.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Monetary"
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

        {/* Field builder */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className={tw.label}>Fields</label>
            <button
              type="button"
              onClick={addField}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              + Add Field
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="text-xs text-gray-400">No fields yet. Add one above.</p>
          ) : (
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-lg border border-gray-200 p-2 dark:border-gray-800"
                >
                  <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                    <input
                      className={tw.input}
                      placeholder="key"
                      value={field.key}
                      onChange={(e) =>
                        updateField(idx, { key: e.target.value })
                      }
                      required
                    />
                    <input
                      className={tw.input}
                      placeholder="Label"
                      value={field.label}
                      onChange={(e) =>
                        updateField(idx, { label: e.target.value })
                      }
                      required
                    />
                    <select
                      className={tw.input}
                      value={field.type}
                      onChange={(e) =>
                        updateField(idx, {
                          type: e.target.value as ModuleFieldType,
                        })
                      }
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={field.required ?? false}
                        onChange={(e) =>
                          updateField(idx, { required: e.target.checked })
                        }
                      />
                      Required
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="mt-1 rounded p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
            disabled={loading}
          >
            {loading
              ? "Saving…"
              : mode === "create"
              ? "Create Module"
              : "Update Module"}
          </button>
        </div>
      </form>
    </div>
  );
}
