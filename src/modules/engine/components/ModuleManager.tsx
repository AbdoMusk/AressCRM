"use client";

import { useState, useEffect } from "react";
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
import { Plus, Edit2, Trash2, X } from "lucide-react";

// Utility to convert text to kebab-case slug
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_");
}

// Client-side field type with metadata
interface ClientModuleField extends ModuleFieldDef {
  keyManuallySet?: boolean;
}

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
  const [fields, setFields] = useState<ClientModuleField[]>([]);
  
  // Track if slug/key were manually modified
  const [slugManuallyModified, setSlugManuallyModified] = useState(false);

  // Auto-generate slug from displayName when it changes (unless manually modified)
  useEffect(() => {
    if (!slugManuallyModified && displayName) {
      setName(toSlug(displayName));
    }
  }, [displayName, slugManuallyModified]);

  function resetForm() {
    setName("");
    setDisplayName("");
    setDescription("");
    setIcon("");
    setFields([]);
    setEditingId(null);
    setError(null);
    setSlugManuallyModified(false);
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
    setSlugManuallyModified(true); // In edit mode, assume slug is already set
  }

  function addField() {
    setFields((prev) => [
      ...prev,
      { key: "", type: "text", label: "", required: false, keyManuallySet: false },
    ]);
  }

  function updateField(idx: number, partial: Partial<ClientModuleField>) {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== idx) return f;
        const updated = { ...f, ...partial };

        // Auto-generate key from label if label changed and key is empty or not manually set
        if ("label" in partial && partial.label && !f.keyManuallySet) {
          const newKey = toSlug(partial.label);
          return { ...updated, key: newKey, keyManuallySet: false };
        }

        return updated;
      })
    );
  }

  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const schema: ModuleSchema = {
      fields: fields.map((f) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { keyManuallySet, ...cleanField } = f as any;
        return cleanField as ModuleFieldDef;
      }),
    };
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
            <label className={tw.label}>Display Name</label>
            <input
              className={tw.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Monetary"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              This is the user-friendly name for the module
            </p>
          </div>
          <div>
            <label className={tw.label}>Module Slug (auto-generated)</label>
            <input
              className={tw.input}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlugManuallyModified(true);
              }}
              placeholder="e.g. monetary"
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
                  className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                >
                  <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {/* Label - most important */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Label
                      </label>
                      <input
                        className={tw.input}
                        placeholder="e.g. Amount"
                        value={field.label}
                        onChange={(e) =>
                          updateField(idx, { label: e.target.value })
                        }
                        required
                      />
                    </div>

                    {/* Key - auto-generated from label */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Key (auto-generated)
                      </label>
                      <input
                        className={tw.input}
                        placeholder="auto"
                        value={field.key}
                        onChange={(e) => {
                          updateField(idx, { 
                            key: e.target.value,
                            keyManuallySet: true,
                          });
                        }}
                      />
                      <p className="mt-1 text-[10px] text-gray-500">
                        {!field.keyManuallySet && field.key
                          ? "Auto-generated from label"
                          : "Click to customize"}
                      </p>
                    </div>

                    {/* Type selector */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Type
                      </label>
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
                    </div>
                  </div>

                  {/* Options for select/multiselect */}
                  {(field.type === "select" || field.type === "multiselect") && (
                    <div className="mt-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Options
                      </label>
                      <div className="mt-1 space-y-1">
                        {(field.options ?? []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              placeholder="Label"
                              value={opt.label}
                              onChange={(e) => {
                                const newOptions = [...(field.options ?? [])];
                                const newValue = toSlug(e.target.value);
                                newOptions[optIdx] = {
                                  ...newOptions[optIdx],
                                  label: e.target.value,
                                  value: newValue,
                                };
                                updateField(idx, { options: newOptions });
                              }}
                            />
                            <input
                              className="w-24 flex-shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              placeholder="Value"
                              value={opt.value}
                              onChange={(e) => {
                                const newOptions = [...(field.options ?? [])];
                                newOptions[optIdx] = {
                                  ...newOptions[optIdx],
                                  value: e.target.value,
                                };
                                updateField(idx, { options: newOptions });
                              }}
                            />
                            <input
                              type="color"
                              className="h-8 w-8 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
                              value={opt.color ?? "#3b82f6"}
                              onChange={(e) => {
                                const newOptions = [...(field.options ?? [])];
                                newOptions[optIdx] = {
                                  ...newOptions[optIdx],
                                  color: e.target.value,
                                };
                                updateField(idx, { options: newOptions });
                              }}
                              title="Option color"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newOptions = (field.options ?? []).filter(
                                  (_, i) => i !== optIdx
                                );
                                updateField(idx, { options: newOptions });
                              }}
                              className="rounded p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = [
                              ...(field.options ?? []),
                              { value: "", label: "", color: "#3b82f6" },
                            ];
                            updateField(idx, { options: newOptions });
                          }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          + Add Option
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Default value for boolean */}
                  {field.type === "boolean" && (
                    <div className="mt-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={Boolean(field.default)}
                          onChange={(e) =>
                            updateField(idx, { default: e.target.checked })
                          }
                        />
                        Default value (checked)
                      </label>
                    </div>
                  )}

                  {/* Default value for non-special types */}
                  {field.type !== "select" &&
                    field.type !== "multiselect" &&
                    field.type !== "boolean" && (
                    <div className="mt-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Default
                      </label>
                      <input
                        className={tw.input}
                        placeholder="Optional"
                        value={(field as any).default ?? ""}
                        onChange={(e) =>
                          updateField(idx, { default: e.target.value || undefined })
                        }
                      />
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    {/* Required checkbox */}
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

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="rounded p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
