"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tw } from "./DynamicField";
import {
  createRelationAction,
  deleteRelationAction,
} from "@/modules/engine/actions/relation.actions";
import type { RelatedObject } from "@/modules/engine/types/object.types";
import { RelationTypes } from "@/modules/engine/types/relation.types";
import { Plus, Trash2, Link2, Search, ArrowRight, ArrowLeft, Users, Building2, UserCheck } from "lucide-react";

interface Props {
  objectId: string;
  relations: RelatedObject[];
}

const RELATION_TYPE_OPTIONS = [
  { value: RelationTypes.RELATED_TO, label: "Related To", icon: Link2, description: "General relation" },
  { value: RelationTypes.PARENT_OF, label: "Parent Of", icon: Users, description: "This object is parent" },
  { value: RelationTypes.BELONGS_TO, label: "Belongs To", icon: Building2, description: "This object belongs to target" },
  { value: RelationTypes.ASSIGNED_TO, label: "Assigned To", icon: UserCheck, description: "Assigned to a person/team" },
  { value: RelationTypes.WORKS_FOR, label: "Works For", icon: Building2, description: "Employment/work relation" },
];

const RELATION_LABELS: Record<string, { outgoing: string; incoming: string; color: string }> = {
  related_to: { outgoing: "Related to", incoming: "Related from", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  parent_of: { outgoing: "Parent of", incoming: "Child of", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  belongs_to: { outgoing: "Belongs to", incoming: "Has member", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  assigned_to: { outgoing: "Assigned to", incoming: "Assignee of", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  works_for: { outgoing: "Works for", incoming: "Employer of", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
};

export function RelationManager({ objectId, relations }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [relationType, setRelationType] = useState<string>(RelationTypes.RELATED_TO);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; displayName: string; objectType: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group relations by type
  const groupedRelations = new Map<string, RelatedObject[]>();
  for (const rel of relations) {
    const key = rel.relationType;
    const list = groupedRelations.get(key) ?? [];
    list.push(rel);
    groupedRelations.set(key, list);
  }

  async function handleSearch(query: string) {
    setSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(
        `/api/objects?search=${encodeURIComponent(query)}&limit=10`
      );
      if (res.ok) {
        const data = await res.json();
        const relatedIds = new Set(relations.map((r) => r.object.id));
        const filtered = (data.objects ?? []).filter(
          (o: { id: string }) =>
            o.id !== objectId && !relatedIds.has(o.id)
        );
        setSearchResults(filtered);
      }
    } catch {
      /* ignore search errors */
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(targetId: string) {
    setError(null);
    try {
      const result = await createRelationAction({
        fromObjectId: objectId,
        toObjectId: targetId,
        relationType,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to create relation");
        return;
      }
      setShowAdd(false);
      setSearch("");
      setSearchResults([]);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add relation");
    }
  }

  async function handleDelete(relationId: string) {
    setError(null);
    try {
      const result = await deleteRelationAction(relationId, objectId);
      if (!result.success) {
        setError(result.error ?? "Failed to remove relation");
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to remove relation"
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          <Link2 size={14} className="mr-1 inline" />
          Relations ({relations.length})
        </h3>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          <Plus size={12} className="mr-0.5 inline" />
          {showAdd ? "Cancel" : "Add Relation"}
        </button>
      </div>

      {error && <div className={tw.error}>{error}</div>}

      {/* Add relation panel */}
      {showAdd && (
        <div className={tw.card}>
          {/* Relation type selector */}
          <div className="mb-3">
            <label className={tw.label}>Relation Type</label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {RELATION_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = relationType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRelationType(opt.value)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    <Icon size={12} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {RELATION_TYPE_OPTIONS.find((o) => o.value === relationType)?.description}
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className={`${tw.input} pl-8`}
              placeholder="Search objects to link..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>
          {searchResults.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {searchResults.map((obj) => (
                <li key={obj.id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(obj.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 dark:text-white">
                        {obj.displayName}
                      </span>
                    </div>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                      {obj.objectType}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searching && (
            <p className="mt-2 text-xs text-gray-400">Searching…</p>
          )}
        </div>
      )}

      {/* Grouped relations */}
      {relations.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
          No relations yet. Click &quot;Add Relation&quot; to link this object to others.
        </p>
      ) : (
        <div className="space-y-3">
          {[...groupedRelations.entries()].map(([type, rels]) => {
            const labels = RELATION_LABELS[type] ?? {
              outgoing: type,
              incoming: type,
              color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
            };

            return (
              <div key={type}>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${labels.color} mb-1.5`}>
                  {type.replace(/_/g, " ")}
                </span>
                <ul className="space-y-1">
                  {rels.map((rel) => (
                    <li
                      key={rel.relationId}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        {rel.direction === "to" ? (
                          <ArrowRight size={12} className="text-gray-400" />
                        ) : (
                          <ArrowLeft size={12} className="text-gray-400" />
                        )}
                        <span className="text-xs text-gray-500">
                          {rel.direction === "to" ? labels.outgoing : labels.incoming}
                        </span>
                        <Link
                          href={`/objects/${rel.object.id}`}
                          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {rel.object.displayName}
                        </Link>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                          {rel.object.objectType}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(rel.relationId)}
                        className="rounded p-1 text-gray-400 hover:text-red-600"
                        title="Remove relation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
