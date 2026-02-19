"use client";

import { tw } from "./DynamicField";
import type { AttachedModule, ModuleSchema } from "@/modules/engine/types/module.types";
import type { ObjectWithModules } from "@/modules/engine/types/object.types";
import { Calendar, User, Tag } from "lucide-react";

interface Props {
  object: ObjectWithModules;
}

/**
 * Read-only detail view that renders all attached modules and their data.
 */
export function ObjectDetailView({ object }: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {object.displayName}
        </h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1">
            <Tag size={14} />
            {object.object_type?.display_name ?? object.object_type?.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar size={14} />
            {new Date(object.created_at).toLocaleDateString()}
          </span>
          {object.owner_id && (
            <span className="inline-flex items-center gap-1">
              <User size={14} />
              {object.owner_id.slice(0, 8)}…
            </span>
          )}
        </div>
      </div>

      {/* Module cards */}
      {object.modules.map((mod) => (
        <ModuleDataCard key={mod.moduleId} module={mod} />
      ))}

      {object.modules.length === 0 && (
        <div className={tw.card}>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No modules attached to this object.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Module data card ──────────────────────────

function ModuleDataCard({ module: mod }: { module: AttachedModule }) {
  return (
    <div className={tw.card}>
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
        {mod.icon && <span className="mr-1">{mod.icon}</span>}
        {mod.displayName}
      </h3>

      {mod.schema.fields.length === 0 ? (
        <p className="text-sm text-gray-400">No fields defined.</p>
      ) : (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {mod.schema.fields.map((field) => {
            const value = mod.data[field.key];
            return (
              <div key={field.key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {field.label}
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-white">
                  {renderFieldValue(value, field.type)}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

function renderFieldValue(value: unknown, type: string): string {
  if (value == null || value === "") return "—";
  if (type === "boolean") return value ? "Yes" : "No";
  if (type === "date" && typeof value === "string")
    return new Date(value).toLocaleDateString();
  if (type === "datetime" && typeof value === "string")
    return new Date(value).toLocaleString();
  if (type === "number" && typeof value === "number")
    return value.toLocaleString();
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
