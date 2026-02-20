"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { tw } from "@/modules/engine/components/DynamicField";
import { ObjectEditForm } from "@/modules/engine/components/ObjectEditForm";
import { deleteObjectAction } from "@/modules/engine/actions/object.actions";
import type { ObjectWithModules } from "@/modules/engine/types/object.types";
import type { ModuleSchema } from "@/modules/engine/types/module.types";
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Edit3,
  Trash2,
  Clock,
  Link2,
  StickyNote,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ── Types ────────────────────────────────────

interface Relation {
  relationId: string;
  relationType: string;
  direction: "outgoing" | "incoming";
  objectId: string;
  objectTypeName: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: any;
  created_by: string | null;
  created_at: string;
}

interface RecordDetailClientProps {
  object: ObjectWithModules;
  availableModules: {
    id: string;
    name: string;
    display_name: string;
    icon: string | null;
    schema: ModuleSchema;
  }[];
  requiredModuleIds: string[];
  relations: Relation[];
  timeline: TimelineEvent[];
  permissions: string[];
}

// ── Component ────────────────────────────────

export function RecordDetailClient({
  object,
  availableModules,
  requiredModuleIds,
  relations,
  timeline,
  permissions,
}: RecordDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "relations">("details");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = permissions.includes("object:update") || permissions.includes("object:update:own");
  const canDelete = permissions.includes("object:delete") || permissions.includes("object:delete:own");

  const handleDelete = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this record? This cannot be undone.")) return;
    setDeleting(true);
    const result = await deleteObjectAction(object.id);
    if (result.success) {
      router.push(`/view/${object.object_type.name}`);
    } else {
      alert(result.error);
      setDeleting(false);
    }
  }, [object.id, object.object_type.name, router]);

  const typeName = object.object_type?.display_name ?? object.object_type?.name ?? "Record";

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {object.displayName}
              </h1>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {typeName}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                Created {new Date(object.created_at).toLocaleDateString()}
              </span>
              {object.owner_id && (
                <span className="flex items-center gap-1">
                  <User size={12} />
                  Owner: {object.owner_id.slice(0, 8)}…
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => setEditing(!editing)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  editing
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                )}
              >
                <Edit3 size={14} />
                {editing ? "Viewing" : "Edit"}
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 size={14} />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1">
          {(["details", "timeline", "relations"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "rounded-t-md px-4 py-2 text-sm font-medium capitalize transition-colors",
                activeTab === tab
                  ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              {tab}
              {tab === "relations" && relations.length > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] dark:bg-gray-800">
                  {relations.length}
                </span>
              )}
              {tab === "timeline" && timeline.length > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] dark:bg-gray-800">
                  {timeline.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "details" && (
          editing ? (
            <ObjectEditForm
              object={object}
              availableModules={availableModules}
              requiredModuleIds={requiredModuleIds}
              onSaved={() => {
                setEditing(false);
                router.refresh();
              }}
            />
          ) : (
            <DetailView object={object} />
          )
        )}

        {activeTab === "timeline" && <TimelineView events={timeline} />}
        {activeTab === "relations" && <RelationsView relations={relations} />}
      </div>
    </div>
  );
}

// ── Detail View ──────────────────────────────

function DetailView({ object }: { object: ObjectWithModules }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {object.modules.map((mod) => (
        <div
          key={mod.moduleId}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {mod.icon && <span className="mr-1.5">{mod.icon}</span>}
            {mod.displayName}
          </h3>
          {mod.schema.fields.length > 0 ? (
            <dl className="space-y-2.5">
              {mod.schema.fields.map((field) => {
                const value = mod.data[field.key];
                return (
                  <div key={field.key} className="flex items-baseline gap-3">
                    <dt className="w-32 flex-shrink-0 text-xs font-medium text-gray-400">
                      {field.label}
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white">
                      {formatDetailValue(value, field.type)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="text-xs text-gray-400">No fields defined.</p>
          )}
        </div>
      ))}
      {object.modules.length === 0 && (
        <p className="col-span-full text-sm text-gray-400">No modules attached.</p>
      )}
    </div>
  );
}

function formatDetailValue(value: unknown, type: string): string {
  if (value == null || value === "") return "—";
  if (type === "boolean") return value ? "Yes" : "No";
  if (type === "date") try { return new Date(String(value)).toLocaleDateString(); } catch { return String(value); }
  if (type === "datetime") try { return new Date(String(value)).toLocaleString(); } catch { return String(value); }
  if (type === "number") return Number(value).toLocaleString();
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

// ── Timeline View ────────────────────────────

function TimelineView({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-400">No timeline events yet.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="mt-0.5 flex-shrink-0">
            <Clock size={14} className="text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {event.title}
              </span>
              <span className="text-[10px] text-gray-400">
                {new Date(event.created_at).toLocaleString()}
              </span>
            </div>
            {event.description && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {event.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Relations View ───────────────────────────

function RelationsView({ relations }: { relations: Relation[] }) {
  if (relations.length === 0) {
    return <p className="text-sm text-gray-400">No relations found.</p>;
  }

  return (
    <div className="space-y-2">
      {relations.map((rel) => (
        <Link
          key={rel.relationId}
          href={`/record/${rel.objectId}`}
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
        >
          <Link2 size={14} className="text-gray-400" />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {rel.objectId.slice(0, 8)}…
            </span>
            <span className="ml-2 text-xs text-gray-400">
              {rel.objectTypeName}
            </span>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {rel.direction === "outgoing" ? "→" : "←"} {rel.relationType}
          </span>
        </Link>
      ))}
    </div>
  );
}
