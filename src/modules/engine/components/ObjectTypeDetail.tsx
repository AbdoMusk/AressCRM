"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { tw } from "./DynamicField";
import { toggleObjectTypeActiveAction } from "@/modules/engine/actions/datamodel.actions";
import {
  createObjectTypeRelationAction,
  toggleObjectTypeRelationAction,
  deleteObjectTypeRelationAction,
} from "@/modules/engine/actions/datamodel.actions";
import type { ModuleRowTyped, ModuleFieldDef } from "@/modules/engine/types/module.types";
import type { ObjectTypeWithModules } from "@/modules/engine/types/object.types";
import type {
  ObjectTypeRelation,
  ObjectTypeRelationCreateInput,
  SchemaRelationType,
} from "@/modules/engine/types/relation.types";
import { SchemaRelationTypes } from "@/modules/engine/types/relation.types";
import {
  ArrowLeft,
  Layers,
  Link2,
  Settings,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Hash,
  Type,
  Mail,
  Phone,
  Calendar,
  CheckSquare,
  List,
  Link as LinkIcon,
  AlignLeft,
  Globe,
} from "lucide-react";

// ── Types ────────────────────────────────────

interface Props {
  objectType: ObjectTypeWithModules;
  modules: ModuleRowTyped[];
  relations: ObjectTypeRelation[];
  allObjectTypes: ObjectTypeWithModules[];
  onBack: () => void;
}

type Tab = "fields" | "relations" | "settings";

// Field type icon and color mapping
const FIELD_TYPE_META: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  text: { icon: <Type size={14} />, color: "#6366f1", label: "Text" },
  email: { icon: <Mail size={14} />, color: "#ec4899", label: "Email" },
  phone: { icon: <Phone size={14} />, color: "#14b8a6", label: "Phone" },
  url: { icon: <Globe size={14} />, color: "#3b82f6", label: "URL" },
  number: { icon: <Hash size={14} />, color: "#f59e0b", label: "Number" },
  date: { icon: <Calendar size={14} />, color: "#8b5cf6", label: "Date" },
  datetime: { icon: <Calendar size={14} />, color: "#a855f7", label: "Date & Time" },
  textarea: { icon: <AlignLeft size={14} />, color: "#64748b", label: "Long Text" },
  select: { icon: <List size={14} />, color: "#f97316", label: "Select" },
  multiselect: { icon: <List size={14} />, color: "#ef4444", label: "Multi-Select" },
  boolean: { icon: <CheckSquare size={14} />, color: "#22c55e", label: "Boolean" },
};

// ── Component ────────────────────────────────

export function ObjectTypeDetail({
  objectType,
  modules,
  relations,
  allObjectTypes,
  onBack,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("fields");
  const [error, setError] = useState<string | null>(null);

  const isActive = (objectType as any).is_active !== false;

  // Collect all fields from attached modules
  const allFields: {
    field: ModuleFieldDef;
    moduleName: string;
    moduleDisplayName: string;
    moduleId: string;
  }[] = [];

  for (const otModule of objectType.modules) {
    const mod = modules.find((m) => m.id === otModule.module_id);
    if (mod) {
      for (const field of mod.schema.fields) {
        allFields.push({
          field,
          moduleName: mod.name,
          moduleDisplayName: mod.display_name,
          moduleId: mod.id,
        });
      }
    }
  }

  async function handleToggleActive() {
    try {
      const result = await toggleObjectTypeActiveAction(
        objectType.id,
        !isActive
      );
      if (!result.success) {
        setError(result.error ?? "Failed to toggle");
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={18} />
          </button>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg text-xl"
            style={{
              backgroundColor: `${objectType.color ?? "#6B7280"}20`,
              color: objectType.color ?? "#6B7280",
            }}
          >
            {objectType.icon || "📦"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {objectType.display_name}
              </h1>
              <span className="text-sm text-gray-400">{objectType.name}</span>
              {!isActive && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  Inactive
                </span>
              )}
            </div>
            {objectType.description && (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {objectType.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {error && <div className={tw.error}>{error}</div>}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800">
        <TabButton
          active={activeTab === "fields"}
          onClick={() => setActiveTab("fields")}
          icon={<Layers size={14} />}
          label="Fields"
          count={allFields.length}
        />
        <TabButton
          active={activeTab === "relations"}
          onClick={() => setActiveTab("relations")}
          icon={<Link2 size={14} />}
          label="Relations"
          count={relations.length}
        />
        <TabButton
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          icon={<Settings size={14} />}
          label="Settings"
        />
      </div>

      {/* Content */}
      {activeTab === "fields" && (
        <FieldsTab
          fields={allFields}
          modules={modules}
          objectType={objectType}
        />
      )}
      {activeTab === "relations" && (
        <RelationsTab
          relations={relations}
          objectType={objectType}
          allObjectTypes={allObjectTypes}
        />
      )}
      {activeTab === "settings" && (
        <SettingsTab
          objectType={objectType}
          isActive={isActive}
          onToggleActive={handleToggleActive}
          moduleCount={objectType.modules.length}
          fieldCount={allFields.length}
          relationCount={relations.length}
        />
      )}
    </div>
  );
}

// ── Tab Button ───────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-blue-500 text-blue-600 dark:text-blue-400"
          : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] dark:bg-gray-800">
          {count}
        </span>
      )}
    </button>
  );
}

// ── Fields Tab ───────────────────────────────

function FieldsTab({
  fields,
  modules,
  objectType,
}: {
  fields: {
    field: ModuleFieldDef;
    moduleName: string;
    moduleDisplayName: string;
    moduleId: string;
  }[];
  modules: ModuleRowTyped[];
  objectType: ObjectTypeWithModules;
}) {
  // Group fields by module
  const groupedByModule = new Map<
    string,
    { displayName: string; fields: { field: ModuleFieldDef; moduleName: string }[] }
  >();

  for (const f of fields) {
    if (!groupedByModule.has(f.moduleId)) {
      groupedByModule.set(f.moduleId, {
        displayName: f.moduleDisplayName,
        fields: [],
      });
    }
    groupedByModule.get(f.moduleId)!.fields.push({
      field: f.field,
      moduleName: f.moduleName,
    });
  }

  if (fields.length === 0) {
    return (
      <div className={tw.card}>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          No fields defined. Add modules to this object type to define fields.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>
          {fields.length} field{fields.length !== 1 ? "s" : ""} across{" "}
          {groupedByModule.size} module{groupedByModule.size !== 1 ? "s" : ""}
        </span>
      </div>

      {/* All fields table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Field
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Type
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Key
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Module
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Required
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Options
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {fields.map((f, idx) => {
              const meta = FIELD_TYPE_META[f.field.type] ?? {
                icon: <Type size={14} />,
                color: "#6b7280",
                label: f.field.type,
              };
              return (
                <tr
                  key={`${f.moduleId}-${f.field.key}-${idx}`}
                  className="bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {f.field.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${meta.color}15`,
                        color: meta.color,
                      }}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {f.field.key}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {f.moduleDisplayName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {f.field.required ? (
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    ) : (
                      <span className="inline-block h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(f.field.type === "select" || f.field.type === "multiselect") &&
                    f.field.options?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {f.field.options.slice(0, 3).map((opt) => (
                          <span
                            key={opt.value}
                            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${opt.color ?? "#6b7280"}20`,
                              color: opt.color ?? "#6b7280",
                            }}
                          >
                            {opt.label}
                          </span>
                        ))}
                        {(f.field.options?.length ?? 0) > 3 && (
                          <span className="text-[10px] text-gray-400">
                            +{(f.field.options?.length ?? 0) - 3}
                          </span>
                        )}
                      </div>
                    ) : f.field.type === "boolean" ? (
                      <span className="text-xs text-gray-400">
                        Default: {f.field.default ? "Yes" : "No"}
                      </span>
                    ) : f.field.default != null ? (
                      <span className="text-xs text-gray-400">
                        Default: {String(f.field.default)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Relations Tab ────────────────────────────

function RelationsTab({
  relations,
  objectType,
  allObjectTypes,
}: {
  relations: ObjectTypeRelation[];
  objectType: ObjectTypeWithModules;
  allObjectTypes: ObjectTypeWithModules[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [targetTypeId, setTargetTypeId] = useState("");
  const [relationType, setRelationType] = useState<SchemaRelationType>("one_to_many");
  const [sourceFieldName, setSourceFieldName] = useState("");
  const [targetFieldName, setTargetFieldName] = useState("");

  async function handleCreateRelation(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const input: ObjectTypeRelationCreateInput = {
      source_type_id: objectType.id,
      target_type_id: targetTypeId,
      relation_type: relationType,
      source_field_name: sourceFieldName,
      target_field_name: targetFieldName,
    };

    try {
      const result = await createObjectTypeRelationAction(input);
      if (!result.success) {
        setError(result.error ?? "Failed to create relation");
        return;
      }
      setShowCreate(false);
      setTargetTypeId("");
      setSourceFieldName("");
      setTargetFieldName("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleRelation(rel: ObjectTypeRelation) {
    try {
      const result = await toggleObjectTypeRelationAction(rel.id, !rel.is_active);
      if (!result.success) {
        setError(result.error ?? "Failed to toggle");
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle");
    }
  }

  async function handleDeleteRelation(rel: ObjectTypeRelation) {
    if (!confirm("Delete this relation definition? This cannot be undone.")) return;
    try {
      const result = await deleteObjectTypeRelationAction(rel.id);
      if (!result.success) {
        setError(result.error ?? "Failed to delete");
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const otherObjectTypes = allObjectTypes.filter((ot) => (ot as any).is_active !== false);

  function getRelationLabel(type: string): string {
    return SchemaRelationTypes.find((t) => t.value === type)?.label ?? type;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Define how {objectType.display_name} connects to other objects.
        </p>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className={tw.btnPrimary}
          >
            <Plus size={14} className="mr-1 inline" />
            Add Relation
          </button>
        )}
      </div>

      {error && <div className={tw.error}>{error}</div>}

      {/* Create Form */}
      {showCreate && (
        <div className={tw.card}>
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            New Relation Field
          </h3>
          <form onSubmit={handleCreateRelation} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={tw.label}>Target Object</label>
                <select
                  className={tw.input}
                  value={targetTypeId}
                  onChange={(e) => setTargetTypeId(e.target.value)}
                  required
                >
                  <option value="">Select target object...</option>
                  {otherObjectTypes.map((ot) => (
                    <option key={ot.id} value={ot.id}>
                      {ot.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={tw.label}>Relation Type</label>
                <select
                  className={tw.input}
                  value={relationType}
                  onChange={(e) =>
                    setRelationType(e.target.value as SchemaRelationType)
                  }
                >
                  {SchemaRelationTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={tw.label}>
                  Field name on {objectType.display_name}
                </label>
                <input
                  className={tw.input}
                  value={sourceFieldName}
                  onChange={(e) => setSourceFieldName(e.target.value)}
                  placeholder={`e.g. Employees`}
                  required
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  What this relation is called on this object
                </p>
              </div>
              <div>
                <label className={tw.label}>
                  Field name on target
                </label>
                <input
                  className={tw.input}
                  value={targetFieldName}
                  onChange={(e) => setTargetFieldName(e.target.value)}
                  placeholder={`e.g. Company`}
                  required
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  What this relation is called on the target object
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={tw.btnSecondary}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={tw.btnPrimary}
                disabled={loading}
              >
                {loading ? "Creating…" : "Create Relation"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Relations */}
      {relations.length === 0 && !showCreate ? (
        <div className={tw.card}>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            No relations defined. Click &quot;Add Relation&quot; to connect{" "}
            {objectType.display_name} to other objects.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {relations.map((rel) => {
            const isSource = rel.source_type_id === objectType.id;
            const otherTypeName = isSource
              ? rel.target_type_display_name
              : rel.source_type_display_name;
            const fieldName = isSource
              ? rel.source_field_name
              : rel.target_field_name;
            const otherFieldName = isSource
              ? rel.target_field_name
              : rel.source_field_name;

            return (
              <div
                key={rel.id}
                className={clsx(
                  tw.card,
                  "flex items-center justify-between",
                  !rel.is_active && "opacity-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                    <Link2 size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {fieldName}
                      </span>
                      <span className="text-xs text-gray-400">→</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {otherTypeName}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                        {getRelationLabel(rel.relation_type)}
                      </span>
                      <span>
                        ← {otherFieldName} on {otherTypeName}
                      </span>
                      {!rel.is_active && (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleRelation(rel)}
                    className={clsx(
                      "rounded p-1.5 transition-colors",
                      rel.is_active
                        ? "text-green-500 hover:bg-green-50 dark:hover:bg-green-950"
                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    title={rel.is_active ? "Deactivate" : "Activate"}
                  >
                    {rel.is_active ? (
                      <ToggleRight size={16} />
                    ) : (
                      <ToggleLeft size={16} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRelation(rel)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ─────────────────────────────

function SettingsTab({
  objectType,
  isActive,
  onToggleActive,
  moduleCount,
  fieldCount,
  relationCount,
}: {
  objectType: ObjectTypeWithModules;
  isActive: boolean;
  onToggleActive: () => void;
  moduleCount: number;
  fieldCount: number;
  relationCount: number;
}) {
  return (
    <div className="space-y-6">
      {/* Object Info */}
      <div className={tw.card}>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Overview
        </h3>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-gray-400">Name</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {objectType.display_name}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400">Slug</dt>
            <dd className="mt-1">
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                {objectType.name}
              </code>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400">Status</dt>
            <dd className="mt-1">
              <span
                className={clsx(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  isActive
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                )}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400">Created</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {new Date(objectType.created_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>

        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-200 pt-4 dark:border-gray-800">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {moduleCount}
            </div>
            <div className="text-xs text-gray-400">Modules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {fieldCount}
            </div>
            <div className="text-xs text-gray-400">Fields</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {relationCount}
            </div>
            <div className="text-xs text-gray-400">Relations</div>
          </div>
        </div>
      </div>

      {/* Attached Modules */}
      <div className={tw.card}>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Attached Modules
        </h3>
        <div className="space-y-1">
          {objectType.modules.map((m) => (
            <div
              key={m.module_id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
            >
              <div className="flex items-center gap-2">
                {m.icon && <span>{m.icon}</span>}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {m.display_name}
                </span>
              </div>
              {m.required && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Required
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-200 p-4 dark:border-red-900">
        <h3 className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">
          Danger Zone
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {isActive ? "Deactivate" : "Activate"} this object type
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isActive
                ? "Deactivating will hide this object from the workspace, but data is preserved."
                : "Reactivating will restore this object and all its data."}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleActive}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium",
              isActive
                ? "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                : "bg-green-600 text-white hover:bg-green-700"
            )}
          >
            {isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>
    </div>
  );
}
