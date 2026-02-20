"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { clsx } from "clsx";
import type { View, ViewFilter, ViewSort } from "@/modules/engine/services/view.service";
import type { ModuleFieldDef } from "@/modules/engine/types/module.types";
import {
  ChevronDown,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  Table2,
  Plus,
  Trash2,
  Check,
  X,
  Settings2,
  Eye,
  Download,
  Columns3,
} from "lucide-react";

// ── Types ────────────────────────────────────

export interface AvailableField {
  module: string;
  field: string;
  label: string;
  fieldDef: ModuleFieldDef;
}

interface ViewToolbarProps {
  views: View[];
  activeView: View;
  availableFields: AvailableField[];
  onViewChange: (viewId: string) => void;
  onLayoutToggle: (layout: "table" | "kanban") => void;
  onFiltersChange: (filters: ViewFilter[]) => void;
  onSortsChange: (sorts: ViewSort[]) => void;
  onCreateView?: (name: string) => void;
  onDeleteView?: (viewId: string) => void;
  /** Called when user selects a different kanban grouping field */
  onKanbanFieldChange?: (moduleName: string, fieldKey: string) => void;
  /** Called when user clicks CSV export */
  onExport?: () => void;
  /** Total record count to show */
  recordCount?: number;
}

// ── Dropdown Shared Hook ─────────────────────

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return { open, setOpen, ref };
}

// ── View Selector ────────────────────────────

function ViewSelector({
  views,
  activeView,
  onViewChange,
  onCreateView,
  onDeleteView,
}: {
  views: View[];
  activeView: View;
  onViewChange: (id: string) => void;
  onCreateView?: (name: string) => void;
  onDeleteView?: (id: string) => void;
}) {
  const { open, setOpen, ref } = useDropdown();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (newName.trim() && onCreateView) {
      onCreateView(newName.trim());
      setNewName("");
      setCreating(false);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <Eye size={15} />
        <span>{activeView.name}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="max-h-60 overflow-auto p-1">
            {views.map((v) => (
              <div
                key={v.id}
                className={clsx(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm cursor-pointer",
                  v.id === activeView.id
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                )}
                onClick={() => { onViewChange(v.id); setOpen(false); }}
              >
                <span className="flex-1 truncate">{v.name}</span>
                {v.id === activeView.id && <Check size={14} />}
                {!v.isDefault && onDeleteView && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteView(v.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 p-1 dark:border-gray-700">
            {creating ? (
              <div className="flex items-center gap-1.5 px-2 py-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setCreating(false);
                  }}
                  placeholder="View name"
                  className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                />
                <button onClick={handleCreate} className="text-blue-500 hover:text-blue-700">
                  <Check size={14} />
                </button>
                <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Plus size={14} />
                <span>Create view</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Filter Builder ───────────────────────────

const OPERATORS = [
  { value: "eq", label: "is" },
  { value: "neq", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

function FilterBuilder({
  filters,
  availableFields,
  onFiltersChange,
}: {
  filters: ViewFilter[];
  availableFields: AvailableField[];
  onFiltersChange: (filters: ViewFilter[]) => void;
}) {
  const { open, setOpen, ref } = useDropdown();

  // Local draft state so we only apply on Enter / Apply button
  const [draft, setDraft] = useState<ViewFilter[]>(filters);

  // Sync draft when upstream filters change (e.g. view switch)
  useEffect(() => { setDraft(filters); }, [filters]);

  const applyFilters = useCallback(
    (next: ViewFilter[]) => { onFiltersChange(next); },
    [onFiltersChange]
  );

  const addFilter = () => {
    if (availableFields.length === 0) return;
    const first = availableFields[0];
    const next = [
      ...draft,
      { module: first.module, field: first.field, operator: "eq" as const, value: "" },
    ];
    setDraft(next);
    // Apply immediately when adding or removing (no text input involved)
    applyFilters(next);
  };

  const removeFilter = (idx: number) => {
    const next = draft.filter((_, i) => i !== idx);
    setDraft(next);
    applyFilters(next);
  };

  const updateFilter = (idx: number, updates: Partial<ViewFilter>) => {
    const next = [...draft];
    next[idx] = { ...next[idx], ...updates };
    setDraft(next);

    // For non-text changes (field selector, operator), apply immediately
    if (!("value" in updates)) {
      applyFilters(next);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter") {
      applyFilters(draft);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
          draft.length > 0
            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        )}
      >
        <Filter size={15} />
        <span>Filter</span>
        {draft.length > 0 && (
          <span className="rounded-full bg-blue-200 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-800 dark:text-blue-300">
            {draft.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[500px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="space-y-2">
            {draft.map((filter, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {/* Field selector */}
                <select
                  value={`${filter.module}.${filter.field}`}
                  onChange={(e) => {
                    const [mod, fld] = e.target.value.split(".");
                    updateFilter(idx, { module: mod, field: fld });
                  }}
                  className="rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                >
                  {availableFields.map((af) => (
                    <option key={`${af.module}.${af.field}`} value={`${af.module}.${af.field}`}>
                      {af.label}
                    </option>
                  ))}
                </select>

                {/* Operator */}
                <select
                  value={filter.operator}
                  onChange={(e) =>
                    updateFilter(idx, { operator: e.target.value as ViewFilter["operator"] })
                  }
                  className="rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>

                {/* Value — only applied on Enter or Apply button */}
                {filter.operator !== "is_empty" && filter.operator !== "is_not_empty" && (
                  <input
                    value={String(filter.value ?? "")}
                    onChange={(e) => updateFilter(idx, { value: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    placeholder="Value… (Enter to apply)"
                    className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                  />
                )}

                {/* Remove */}
                <button
                  onClick={() => removeFilter(idx)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={addFilter}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600"
            >
              <Plus size={12} />
              Add filter
            </button>
            {draft.length > 0 && (
              <button
                onClick={() => applyFilters(draft)}
                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sort Builder ─────────────────────────────

function SortBuilder({
  sorts,
  availableFields,
  onSortsChange,
}: {
  sorts: ViewSort[];
  availableFields: AvailableField[];
  onSortsChange: (sorts: ViewSort[]) => void;
}) {
  const { open, setOpen, ref } = useDropdown();

  const addSort = () => {
    if (availableFields.length === 0) return;
    const first = availableFields[0];
    onSortsChange([
      ...sorts,
      { module: first.module, field: first.field, direction: "asc" },
    ]);
  };

  const removeSort = (idx: number) => {
    onSortsChange(sorts.filter((_, i) => i !== idx));
  };

  const updateSort = (idx: number, updates: Partial<ViewSort>) => {
    const newSorts = [...sorts];
    newSorts[idx] = { ...newSorts[idx], ...updates };
    onSortsChange(newSorts);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
          sorts.length > 0
            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        )}
      >
        <ArrowUpDown size={15} />
        <span>Sort</span>
        {sorts.length > 0 && (
          <span className="rounded-full bg-blue-200 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-800 dark:text-blue-300">
            {sorts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[360px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="space-y-2">
            {sorts.map((sort, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={`${sort.module}.${sort.field}`}
                  onChange={(e) => {
                    const [mod, fld] = e.target.value.split(".");
                    updateSort(idx, { module: mod, field: fld });
                  }}
                  className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                >
                  {availableFields.map((af) => (
                    <option key={`${af.module}.${af.field}`} value={`${af.module}.${af.field}`}>
                      {af.label}
                    </option>
                  ))}
                </select>

                <select
                  value={sort.direction}
                  onChange={(e) =>
                    updateSort(idx, { direction: e.target.value as "asc" | "desc" })
                  }
                  className="rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="asc">A → Z</option>
                  <option value="desc">Z → A</option>
                </select>

                <button
                  onClick={() => removeSort(idx)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addSort}
            className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600"
          >
            <Plus size={12} />
            Add sort
          </button>
        </div>
      )}
    </div>
  );
}

// ── Kanban Field Selector ────────────────────

function KanbanFieldSelector({
  availableFields,
  activeModule,
  activeField,
  onKanbanFieldChange,
}: {
  availableFields: AvailableField[];
  activeModule: string | null;
  activeField: string | null;
  onKanbanFieldChange: (moduleName: string, fieldKey: string) => void;
}) {
  const { open, setOpen, ref } = useDropdown();

  // Only select-type fields can be used for kanban grouping
  const selectFields = availableFields.filter((af) => af.fieldDef.type === "select");
  const currentLabel = selectFields.find(
    (sf) => sf.module === activeModule && sf.field === activeField
  )?.label ?? "Select field";

  if (selectFields.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors dark:text-gray-400 dark:hover:bg-gray-800"
        title="Kanban grouping field"
      >
        <Columns3 size={15} />
        <span className="max-w-[120px] truncate">{currentLabel}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Group by
          </div>
          {selectFields.map((sf) => (
            <button
              key={`${sf.module}.${sf.field}`}
              onClick={() => {
                onKanbanFieldChange(sf.module, sf.field);
                setOpen(false);
              }}
              className={clsx(
                "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm",
                sf.module === activeModule && sf.field === activeField
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
              )}
            >
              <span className="flex-1 truncate text-left">{sf.label}</span>
              {sf.module === activeModule && sf.field === activeField && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Toolbar Component ───────────────────

export function ViewToolbar({
  views,
  activeView,
  availableFields,
  onViewChange,
  onLayoutToggle,
  onFiltersChange,
  onSortsChange,
  onCreateView,
  onDeleteView,
  onKanbanFieldChange,
  onExport,
  recordCount,
}: ViewToolbarProps) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200 px-4 py-1.5 dark:border-gray-800">
      {/* View selector */}
      <ViewSelector
        views={views}
        activeView={activeView}
        onViewChange={onViewChange}
        onCreateView={onCreateView}
        onDeleteView={onDeleteView}
      />

      {/* Divider */}
      <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      {/* Filter */}
      <FilterBuilder
        filters={activeView.filters}
        availableFields={availableFields}
        onFiltersChange={onFiltersChange}
      />

      {/* Sort */}
      <SortBuilder
        sorts={activeView.sorts}
        availableFields={availableFields}
        onSortsChange={onSortsChange}
      />

      {/* Kanban field selector (only in kanban mode) */}
      {activeView.layoutType === "kanban" && onKanbanFieldChange && (
        <>
          <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <KanbanFieldSelector
            availableFields={availableFields}
            activeModule={activeView.kanbanModuleName}
            activeField={activeView.kanbanFieldKey}
            onKanbanFieldChange={onKanbanFieldChange}
          />
        </>
      )}

      {/* Divider */}
      <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      {/* Layout toggle */}
      <div className="flex items-center rounded-md border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onLayoutToggle("table")}
          className={clsx(
            "rounded-l-md px-2 py-1 transition-colors",
            activeView.layoutType === "table"
              ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          )}
          title="Table view"
        >
          <Table2 size={15} />
        </button>
        <button
          onClick={() => onLayoutToggle("kanban")}
          className={clsx(
            "rounded-r-md px-2 py-1 transition-colors",
            activeView.layoutType === "kanban"
              ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          )}
          title="Kanban view"
        >
          <LayoutGrid size={15} />
        </button>
      </div>

      {/* CSV Export */}
      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors dark:text-gray-400 dark:hover:bg-gray-800"
          title="Export as CSV"
        >
          <Download size={15} />
          <span className="hidden sm:inline">Export</span>
        </button>
      )}

      {/* Record count */}
      <div className="ml-auto text-xs text-gray-400">
        {recordCount != null && (
          <span>{recordCount.toLocaleString()} record{recordCount !== 1 ? "s" : ""}</span>
        )}
      </div>
    </div>
  );
}
