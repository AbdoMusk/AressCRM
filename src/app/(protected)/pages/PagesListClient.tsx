"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tw } from "@/modules/engine/components/DynamicField";
import { createPageAction, deletePageAction } from "@/modules/engine/actions/page.actions";
import type { Page } from "@/modules/engine/services/page.service";
import { Plus, Trash2, FileText, Globe, Lock, ExternalLink } from "lucide-react";

interface Props {
  pages: Page[];
  userId: string;
}

export function PagesListClient({ pages, userId }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const result = await createPageAction({
      name: name.trim(),
      description: description.trim() || undefined,
      isPublic: true,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to create page");
      setLoading(false);
      return;
    }

    setShowCreate(false);
    setName("");
    setDescription("");
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(pageId: string) {
    if (!confirm("Delete this page?")) return;
    const result = await deletePageAction(pageId);
    if (!result.success) {
      alert(result.error ?? "Failed to delete");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowCreate(!showCreate)}
        className={tw.btnPrimary}
      >
        <Plus size={14} className="mr-1 inline" />
        Create Page
      </button>

      {showCreate && (
        <form onSubmit={handleCreate} className={tw.card}>
          {error && <div className={tw.error}>{error}</div>}
          <div className="space-y-3">
            <div>
              <label className={tw.label}>Page Name</label>
              <input
                className={tw.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sales Report"
                required
              />
            </div>
            <div>
              <label className={tw.label}>Description</label>
              <input
                className={tw.input}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={tw.btnSecondary}
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} className={tw.btnPrimary}>
                {loading ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </form>
      )}

      {pages.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <FileText size={32} className="mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">
            No custom pages yet. Create one to build your own dashboards and reports.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" />
                  <Link
                    href={`/pages/${page.slug}`}
                    className="font-medium text-gray-900 hover:text-blue-600 dark:text-white"
                  >
                    {page.name}
                  </Link>
                </div>
                <div className="flex items-center gap-1">
                  {page.isPublic ? (
                    <Globe size={12} className="text-green-500" />
                  ) : (
                    <Lock size={12} className="text-gray-400" />
                  )}
                  {page.createdBy === userId && (
                    <button
                      onClick={() => handleDelete(page.id)}
                      className="rounded p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              {page.description && (
                <p className="mt-1 text-xs text-gray-500">{page.description}</p>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <span>{page.widgets.length} widgets</span>
                <span>·</span>
                <span>{new Date(page.createdAt).toLocaleDateString()}</span>
              </div>
              <Link
                href={`/pages/${page.slug}`}
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                Open <ExternalLink size={10} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
