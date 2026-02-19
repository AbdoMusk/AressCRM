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
import { Plus, Trash2, Link2, Search } from "lucide-react";

interface Props {
  objectId: string;
  relations: RelatedObject[];
}

export function RelationManager({ objectId, relations }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; displayName: string; objectType: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // Filter out current object and already-related objects
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
        relationType: "related",
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          <Link2 size={14} className="mr-1 inline" />
          Relations
        </h3>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          <Plus size={12} className="mr-0.5 inline" />
          {showAdd ? "Cancel" : "Add"}
        </button>
      </div>

      {error && <div className={tw.error}>{error}</div>}

      {/* Add relation search */}
      {showAdd && (
        <div className={tw.card}>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className={`${tw.input} pl-8`}
              placeholder="Search objects..."
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
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <span className="text-gray-900 dark:text-white">
                      {obj.displayName}
                    </span>
                    <span className="text-xs text-gray-400">
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

      {/* Relation list */}
      {relations.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No relations yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {relations.map((rel) => (
            <li
              key={rel.relationId}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {rel.direction === "from" ? "→" : "←"}{" "}
                  {rel.relationType}
                </span>
                <Link
                  href={`/objects/${rel.object.id}`}
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {rel.object.displayName}
                </Link>
                <span className="text-xs text-gray-400">
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
      )}
    </div>
  );
}
