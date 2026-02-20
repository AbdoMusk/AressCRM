"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { ObjectWithModules } from "@/modules/engine/types/object.types";
import type { View, ViewFilter, ViewSort } from "@/modules/engine/services/view.service";
import type { ModuleFieldDef } from "@/modules/engine/types/module.types";
import { RecordTable, type ColumnDef } from "@/components/records/RecordTable";
import { RecordKanban } from "@/components/records/RecordKanban";
import { ViewToolbar, type AvailableField } from "@/components/views/ViewToolbar";
import { createViewAction, updateViewAction, deleteViewAction } from "@/modules/engine/actions/view.actions";
import { updateObjectModuleAction } from "@/modules/engine/actions/object.actions";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

// ── Types ────────────────────────────────────

interface ViewPageClientProps {
  objectType: {
    id: string;
    name: string;
    displayName: string;
    icon: string | null;
    color: string | null;
  };
  views: View[];
  activeViewId: string;
  objects: ObjectWithModules[];
  total: number;
  currentPage: number;
  columns: ColumnDef[];
  availableFields: AvailableField[];
  kanbanFieldDef: ModuleFieldDef | null;
  kanbanModuleName: string | null;
  kanbanFieldKey: string | null;
}

// ── Component ────────────────────────────────

export function ViewPageClient({
  objectType,
  views,
  activeViewId,
  objects,
  total,
  currentPage,
  columns,
  availableFields,
  kanbanFieldDef,
  kanbanModuleName,
  kanbanFieldKey,
}: ViewPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeView = views.find((v) => v.id === activeViewId) ?? views[0];
  const totalPages = Math.ceil(total / 50);

  // ── Navigation Helpers ──────────────────────

  const pushParams = useCallback(
    (params: Record<string, string | undefined>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, val]) => {
        if (val === undefined) sp.delete(key);
        else sp.set(key, val);
      });
      router.push(`/view/${objectType.name}?${sp.toString()}`);
    },
    [router, objectType.name, searchParams]
  );

  // ── Handlers ────────────────────────────────

  const handleViewChange = useCallback(
    (viewId: string) => {
      startTransition(() => {
        pushParams({ view: viewId, page: undefined });
      });
    },
    [pushParams]
  );

  const handleLayoutToggle = useCallback(
    async (layout: "table" | "kanban") => {
      await updateViewAction(activeView.id, { layoutType: layout });
      startTransition(() => router.refresh());
    },
    [activeView.id, router]
  );

  const handleFiltersChange = useCallback(
    async (filters: ViewFilter[]) => {
      await updateViewAction(activeView.id, { filters });
      startTransition(() => {
        pushParams({ page: undefined }); // Reset to page 1
        router.refresh();
      });
    },
    [activeView.id, router, pushParams]
  );

  const handleSortsChange = useCallback(
    async (sorts: ViewSort[]) => {
      await updateViewAction(activeView.id, { sorts });
      startTransition(() => router.refresh());
    },
    [activeView.id, router]
  );

  const handleCreateView = useCallback(
    async (name: string) => {
      const result = await createViewAction({
        objectTypeId: objectType.id,
        name,
        layoutType: "table",
      });
      if (result.success) {
        startTransition(() => {
          pushParams({ view: result.data.id });
        });
      }
    },
    [objectType.id, pushParams]
  );

  const handleDeleteView = useCallback(
    async (viewId: string) => {
      await deleteViewAction(viewId);
      startTransition(() => {
        pushParams({ view: undefined });
        router.refresh();
      });
    },
    [router, pushParams]
  );

  const handleRecordClick = useCallback(
    (objectId: string) => {
      router.push(`/record/${objectId}`);
    },
    [router]
  );

  const handleRecordMove = useCallback(
    async (objectId: string, newValue: string) => {
      if (!kanbanModuleName || !kanbanFieldKey) return;

      // Find the object's module id for the kanban module
      const obj = objects.find((o) => o.id === objectId);
      if (!obj) return;

      const mod = obj.modules.find((m) => m.moduleName === kanbanModuleName);
      if (!mod) return;

      // Server update only — optimistic UI is handled in RecordKanban
      await updateObjectModuleAction(objectId, mod.id, {
        ...mod.data,
        [kanbanFieldKey]: newValue,
      });
    },
    [objects, kanbanModuleName, kanbanFieldKey]
  );

  const handleKanbanFieldChange = useCallback(
    async (moduleName: string, fieldKey: string) => {
      await updateViewAction(activeView.id, {
        kanbanModuleName: moduleName,
        kanbanFieldKey: fieldKey,
      });
      startTransition(() => router.refresh());
    },
    [activeView.id, router]
  );

  const handleExport = useCallback(() => {
    // Build CSV from current objects using columns config
    const headers = columns.map((c) => c.label);
    const rows = objects.map((obj) => {
      return columns.map((col) => {
        const mod = obj.modules.find((m) => m.moduleName === col.module);
        const val = mod?.data?.[col.field];
        if (val == null) return "";
        return String(val).replace(/"/g, '""');
      });
    });

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${objectType.name}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [objects, columns, objectType.name]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      pushParams({ page: String(newPage) });
    },
    [pushParams]
  );

  // ── Render ──────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <div
          className="h-4 w-4 rounded"
          style={{ backgroundColor: objectType.color ?? "#6B7280" }}
        />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          {objectType.displayName}
        </h1>
        <button
          onClick={() => router.push(`/view/${objectType.name}/new`)}
          className="ml-auto flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          New
        </button>
      </div>

      {/* View toolbar */}
      <ViewToolbar
        views={views}
        activeView={activeView}
        availableFields={availableFields}
        onViewChange={handleViewChange}
        onLayoutToggle={handleLayoutToggle}
        onFiltersChange={handleFiltersChange}
        onSortsChange={handleSortsChange}
        onCreateView={handleCreateView}
        onDeleteView={handleDeleteView}
        onKanbanFieldChange={handleKanbanFieldChange}
        onExport={handleExport}
        recordCount={total}
      />

      {/* Loading overlay */}
      {isPending && (
        <div className="flex h-1 bg-gray-100 dark:bg-gray-800">
          <div className="h-full w-1/3 animate-pulse bg-blue-500 rounded-r" />
        </div>
      )}

      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeView.layoutType === "table" ? (
          <RecordTable
            objects={objects}
            columns={columns}
            sorts={activeView.sorts}
            onSortChange={handleSortsChange}
            onRecordClick={handleRecordClick}
            loading={isPending}
          />
        ) : kanbanFieldDef && kanbanModuleName && kanbanFieldKey ? (
          <RecordKanban
            objects={objects}
            kanbanModuleName={kanbanModuleName}
            kanbanFieldKey={kanbanFieldKey}
            kanbanFieldDef={kanbanFieldDef}
            cardFields={availableFields
              .filter((af) => af.module !== kanbanModuleName || af.field !== kanbanFieldKey)
              .slice(0, 3)
              .map((af) => ({
                module: af.module,
                field: af.field,
                label: af.fieldDef.label,
                fieldDef: af.fieldDef,
              }))}
            onRecordMove={handleRecordMove}
            onRecordClick={handleRecordClick}
            loading={isPending}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            No select field available for Kanban view.
            <br />
            Switch to Table view or configure a select field on your modules.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-2 dark:border-gray-800">
          <span className="text-xs text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
