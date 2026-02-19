"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DynamicForm } from "./DynamicForm";
import { tw } from "./DynamicField";
import { createObjectAction } from "@/modules/engine/actions/object.actions";
import type {
  ModuleSchema,
} from "@/modules/engine/types/module.types";
import type { ObjectTypeWithSchemas } from "@/modules/engine/types/object.types";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  objectTypes: ObjectTypeWithSchemas[];
  /** Pre-select an object type (e.g. from ?type= query param) */
  initialTypeId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Full object creation form.
 *
 * 1. User picks an object type
 * 2. For each module attached to that type, a DynamicForm is shown
 * 3. Required modules are always visible; optional ones are collapsible
 * 4. Submit gathers all module data and calls createObjectAction
 */
export function ObjectCreateForm({
  objectTypes,
  initialTypeId,
  onSuccess,
  onCancel,
}: Props) {
  const router = useRouter();
  const [selectedTypeId, setSelectedTypeId] = useState(initialTypeId ?? "");
  // Data keyed by module_name (not ID) since createObject expects names
  const [moduleData, setModuleData] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [expandedOptional, setExpandedOptional] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedType = objectTypes.find((t) => t.id === selectedTypeId);

  // When object type changes, reset module data with defaults
  function handleTypeChange(typeId: string) {
    setSelectedTypeId(typeId);
    setError(null);

    const type = objectTypes.find((t) => t.id === typeId);
    if (!type) {
      setModuleData({});
      return;
    }

    const initial: Record<string, Record<string, unknown>> = {};
    for (const mapping of type.modules) {
      if (!mapping.required) continue; // Only pre-populate required
      const defaults: Record<string, unknown> = {};
      for (const field of mapping.schema.fields) {
        if (field.default !== undefined) {
          defaults[field.key] = field.default;
        }
      }
      initial[mapping.module_name] = defaults;
    }
    setModuleData(initial);
    setExpandedOptional(new Set());
  }

  function updateModuleData(
    moduleName: string,
    data: Record<string, unknown>
  ) {
    setModuleData((prev) => ({ ...prev, [moduleName]: data }));
  }

  function toggleOptional(moduleName: string, schema: ModuleSchema) {
    setExpandedOptional((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) {
        next.delete(moduleName);
        // Clear optional module data when collapsing
        setModuleData((prevData) => {
          const d = { ...prevData };
          delete d[moduleName];
          return d;
        });
      } else {
        next.add(moduleName);
        // Initialize defaults for optional module
        const defaults: Record<string, unknown> = {};
        for (const field of schema.fields) {
          if (field.default !== undefined) {
            defaults[field.key] = field.default;
          }
        }
        setModuleData((prevData) => ({
          ...prevData,
          [moduleName]: defaults,
        }));
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await createObjectAction({
        objectTypeId: selectedTypeId,
        modules: moduleData,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to create object");
        return;
      }

      router.refresh();
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/objects/${result.data?.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create object");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className={tw.error}>{error}</div>}

      {/* Type picker */}
      <div>
        <label className={tw.label}>Object Type *</label>
        <select
          value={selectedTypeId}
          onChange={(e) => handleTypeChange(e.target.value)}
          required
          className={tw.input}
        >
          <option value="">— Choose object type —</option>
          {objectTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.display_name}
            </option>
          ))}
        </select>
      </div>

      {/* Module forms */}
      {selectedType && (
        <div className="space-y-4">
          {/* Required modules */}
          {selectedType.modules
            .filter((c) => c.required)
            .map((mapping) => (
              <div key={mapping.module_id} className={tw.card}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {mapping.display_name}
                  <span className="text-xs font-normal text-red-500">
                    required
                  </span>
                </h3>
                <DynamicForm
                  schema={mapping.schema}
                  data={moduleData[mapping.module_name] ?? {}}
                  onChange={(data) =>
                    updateModuleData(mapping.module_name, data)
                  }
                />
              </div>
            ))}

          {/* Optional modules */}
          {selectedType.modules
            .filter((c) => !c.required)
            .map((mapping) => {
              const isExpanded = expandedOptional.has(mapping.module_name);
              return (
                <div key={mapping.module_id} className={tw.card}>
                  <button
                    type="button"
                    onClick={() => toggleOptional(mapping.module_name, mapping.schema)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                      {mapping.display_name}
                      <span className="text-xs font-normal text-gray-400">
                        optional
                      </span>
                    </h3>
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-400" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="mt-3">
                      <DynamicForm
                        schema={mapping.schema}
                        data={moduleData[mapping.module_name] ?? {}}
                        onChange={(data) =>
                          updateModuleData(mapping.module_name, data)
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={tw.btnSecondary}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !selectedTypeId}
          className={tw.btnPrimary}
        >
          {loading ? "Creating…" : "Create Object"}
        </button>
      </div>
    </form>
  );
}
