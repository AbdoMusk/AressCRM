"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DynamicForm } from "./DynamicForm";
import { tw } from "./DynamicField";
import {
  updateObjectModuleAction,
  attachModuleAction,
  detachModuleAction,
} from "@/modules/engine/actions/object.actions";
import type {
  ModuleSchema,
  AttachedModule,
} from "@/modules/engine/types/module.types";
import type { ObjectWithModules } from "@/modules/engine/types/object.types";
import { ChevronDown, ChevronRight, Plus, Trash2, Save } from "lucide-react";

interface Props {
  object: ObjectWithModules;
  /** All available modules for attaching new ones */
  availableModules?: {
    id: string;
    name: string;
    display_name: string;
    icon: string | null;
    schema: ModuleSchema;
  }[];
  /** Module IDs that are required by this object's type */
  requiredModuleIds?: string[];
  onSaved?: () => void;
}

/**
 * Edit form for an existing object. Shows each attached module as an
 * expandable card with its dynamic form. Allows saving individual modules,
 * attaching new ones, and detaching optional ones.
 */
export function ObjectEditForm({
  object,
  availableModules = [],
  requiredModuleIds = [],
  onSaved,
}: Props) {
  const router = useRouter();
  const [moduleData, setModuleData] = useState<
    Record<string, Record<string, unknown>>
  >(() => {
    const initial: Record<string, Record<string, unknown>> = {};
    for (const mod of object.modules) {
      initial[mod.moduleId] = { ...mod.data };
    }
    return initial;
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(object.modules.map((m) => m.moduleId))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Modules not yet attached to this object
  const unattachedModules = availableModules.filter(
    (m) => !object.modules.some((om) => om.moduleId === m.id)
  );

  function toggleExpand(moduleId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  async function handleSaveModule(mod: AttachedModule) {
    setSavingId(mod.moduleId);
    setError(null);
    setSuccessId(null);

    try {
      const data = moduleData[mod.moduleId] ?? {};
      const result = await updateObjectModuleAction(
        object.id,
        mod.moduleId,
        data
      );

      if (!result.success) {
        setError(result.error ?? "Failed to save");
        return;
      }

      setSuccessId(mod.moduleId);
      setTimeout(() => setSuccessId(null), 2000);
      router.refresh();
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingId(null);
    }
  }

  async function handleAttach(moduleId: string) {
    setError(null);
    try {
      const result = await attachModuleAction(object.id, moduleId, {});
      if (!result.success) {
        setError(result.error ?? "Failed to attach module");
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to attach");
    }
  }

  async function handleDetach(moduleId: string) {
    setError(null);
    try {
      const result = await detachModuleAction(object.id, moduleId);
      if (!result.success) {
        setError(result.error ?? "Failed to detach module");
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to detach");
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className={tw.error}>{error}</div>}

      {/* Attached modules */}
      {object.modules.map((mod) => {
        const isExpanded = expandedIds.has(mod.moduleId);
        const isRequired = requiredModuleIds.includes(mod.moduleId);
        const isSaving = savingId === mod.moduleId;
        const isSuccess = successId === mod.moduleId;

        return (
          <div key={mod.moduleId} className={tw.card}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleExpand(mod.moduleId)}
                className="flex items-center gap-2 text-left"
              >
                {isExpanded ? (
                  <ChevronDown size={16} className="text-gray-400" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400" />
                )}
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {mod.displayName}
                </h3>
                {isRequired && (
                  <span className="text-xs text-red-500">required</span>
                )}
                {isSuccess && (
                  <span className="text-xs text-green-500">✓ Saved</span>
                )}
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSaveModule(mod)}
                  disabled={isSaving}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                  title="Save module"
                >
                  <Save size={14} />
                </button>
                {!isRequired && (
                  <button
                    type="button"
                    onClick={() => handleDetach(mod.moduleId)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                    title="Detach module"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="mt-3">
                <DynamicForm
                  schema={mod.schema}
                  data={moduleData[mod.moduleId] ?? {}}
                  onChange={(data) =>
                    setModuleData((prev) => ({
                      ...prev,
                      [mod.moduleId]: data,
                    }))
                  }
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Attach new module */}
      {unattachedModules.length > 0 && (
        <div className={tw.card}>
          <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Plus size={14} className="mr-1 inline" />
            Attach Module
          </h3>
          <div className="flex flex-wrap gap-2">
            {unattachedModules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleAttach(m.id)}
                className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
              >
                + {m.display_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
