"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import type { ObjectWithModules } from "@/modules/engine/types/object.types";
import type { ModuleFieldDef, SelectOption } from "@/modules/engine/types/module.types";
import type { ViewFieldConfig, ViewSort } from "@/modules/engine/services/view.service";
import { ChevronUp, ChevronDown, GripVertical } from "lucide-react";

// ── Types ────────────────────────────────────

export interface ColumnDef {
  module: string;
  field: string;
  label: string;
  fieldDef: ModuleFieldDef;
  width: number;
  position: number;
}

interface RecordTableProps {
  objects: ObjectWithModules[];
  columns: ColumnDef[];
  sorts: ViewSort[];
  onSortChange?: (sorts: ViewSort[]) => void;
  onRecordClick?: (objectId: string) => void;
  /** When true, the name column links to the record detail page */
  linkToDetail?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

// ── Helpers ──────────────────────────────────

function getCellValue(
  object: ObjectWithModules,
  moduleName: string,
  fieldKey: string
): unknown {
  const mod = object.modules.find((m) => m.moduleName === moduleName);
  return mod?.data?.[fieldKey] ?? null;
}

function formatCellValue(value: unknown, fieldDef: ModuleFieldDef): string {
  if (value == null || value === "") return "—";

  switch (fieldDef.type) {
    case "boolean":
      return value ? "Yes" : "No";
    case "date":
      try { return new Date(String(value)).toLocaleDateString(); }
      catch { return String(value); }
    case "datetime":
      try { return new Date(String(value)).toLocaleString(); }
      catch { return String(value); }
    case "number":
      return Number(value).toLocaleString();
    case "select": {
      const opt = fieldDef.options?.find((o) => o.value === value);
      return opt?.label ?? String(value);
    }
    case "multiselect": {
      if (!Array.isArray(value)) return String(value);
      return value
        .map((v) => fieldDef.options?.find((o) => o.value === v)?.label ?? v)
        .join(", ");
    }
    case "url":
      return String(value);
    default:
      return String(value);
  }
}

function getSelectColor(value: unknown, fieldDef: ModuleFieldDef): string | undefined {
  if (fieldDef.type !== "select" || value == null) return undefined;
  return fieldDef.options?.find((o) => o.value === value)?.color;
}

// ── Component ────────────────────────────────

export function RecordTable({
  objects,
  columns,
  sorts,
  onSortChange,
  onRecordClick,
  linkToDetail = true,
  loading = false,
  emptyMessage = "No records found",
}: RecordTableProps) {
  const router = useRouter();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const w: Record<string, number> = {};
    columns.forEach((c) => { w[`${c.module}.${c.field}`] = c.width; });
    return w;
  });

  // Sort columns by position
  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns]
  );

  // Handle column sort toggle
  const handleSort = useCallback(
    (col: ColumnDef) => {
      if (!onSortChange) return;
      const existing = sorts.find(
        (s) => s.module === col.module && s.field === col.field
      );
      if (!existing) {
        onSortChange([{ module: col.module, field: col.field, direction: "asc" }]);
      } else if (existing.direction === "asc") {
        onSortChange([{ module: col.module, field: col.field, direction: "desc" }]);
      } else {
        onSortChange([]);
      }
    },
    [sorts, onSortChange]
  );

  const handleRowClick = useCallback(
    (objectId: string) => {
      if (onRecordClick) {
        onRecordClick(objectId);
      } else if (linkToDetail) {
        router.push(`/record/${objectId}`);
      }
    },
    [onRecordClick, linkToDetail, router]
  );

  // Column resize handler
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, colKey: string) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = colWidths[colKey] ?? 150;

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        setColWidths((prev) => ({
          ...prev,
          [colKey]: Math.max(80, startWidth + delta),
        }));
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [colWidths]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          {/* ── Header ── */}
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/80">
              {/* Row number */}
              <th className="w-10 px-2 py-2 text-center text-xs font-medium text-gray-400">
                #
              </th>
              {/* Name column (always first) */}
              <th className="sticky left-0 z-20 min-w-[180px] bg-gray-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-900/80 dark:text-gray-400">
                Name
              </th>
              {sortedColumns.map((col) => {
                const colKey = `${col.module}.${col.field}`;
                const sort = sorts.find(
                  (s) => s.module === col.module && s.field === col.field
                );
                const width = colWidths[colKey] ?? col.width;
                return (
                  <th
                    key={colKey}
                    className="group relative px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    style={{ width, minWidth: 80, maxWidth: width }}
                  >
                    <button
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                      onClick={() => handleSort(col)}
                    >
                      <span className="truncate">{col.label}</span>
                      {sort?.direction === "asc" && <ChevronUp size={12} />}
                      {sort?.direction === "desc" && <ChevronDown size={12} />}
                    </button>
                    {/* Resize handle */}
                    <div
                      className="absolute top-0 right-0 h-full w-1 cursor-col-resize opacity-0 transition-opacity hover:bg-blue-400 group-hover:opacity-100"
                      onMouseDown={(e) => handleResizeStart(e, colKey)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={sortedColumns.length + 2}
                  className="py-20 text-center text-sm text-gray-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    Loading…
                  </div>
                </td>
              </tr>
            )}

            {!loading && objects.length === 0 && (
              <tr>
                <td
                  colSpan={sortedColumns.length + 2}
                  className="py-20 text-center text-sm text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!loading &&
              objects.map((obj, idx) => (
                <tr
                  key={obj.id}
                  onClick={() => handleRowClick(obj.id)}
                  onMouseEnter={() => setHoveredRow(obj.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={clsx(
                    "cursor-pointer border-b border-gray-100 transition-colors dark:border-gray-800/50",
                    hoveredRow === obj.id
                      ? "bg-blue-50/60 dark:bg-blue-950/20"
                      : idx % 2 === 0
                        ? "bg-white dark:bg-gray-950"
                        : "bg-gray-50/40 dark:bg-gray-900/40"
                  )}
                >
                  {/* Row number */}
                  <td className="px-2 py-2.5 text-center text-xs text-gray-400">
                    {idx + 1}
                  </td>

                  {/* Name (sticky) */}
                  <td
                    className={clsx(
                      "sticky left-0 z-10 min-w-[180px] px-3 py-2.5 font-medium",
                      hoveredRow === obj.id
                        ? "bg-blue-50/60 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300"
                        : idx % 2 === 0
                          ? "bg-white text-gray-900 dark:bg-gray-950 dark:text-white"
                          : "bg-gray-50/40 text-gray-900 dark:bg-gray-900/40 dark:text-white"
                    )}
                  >
                    <span className="truncate">{obj.displayName}</span>
                  </td>

                  {/* Data columns */}
                  {sortedColumns.map((col) => {
                    const colKey = `${col.module}.${col.field}`;
                    const width = colWidths[colKey] ?? col.width;
                    const value = getCellValue(obj, col.module, col.field);
                    const selectColor = getSelectColor(value, col.fieldDef);

                    return (
                      <td
                        key={colKey}
                        className="px-3 py-2.5 text-gray-600 dark:text-gray-400"
                        style={{ width, minWidth: 80, maxWidth: width }}
                      >
                        {col.fieldDef.type === "select" && selectColor ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${selectColor}20`,
                              color: selectColor,
                            }}
                          >
                            {formatCellValue(value, col.fieldDef)}
                          </span>
                        ) : col.fieldDef.type === "boolean" ? (
                          <span
                            className={clsx(
                              "inline-block h-4 w-4 rounded",
                              value
                                ? "bg-green-500"
                                : "border border-gray-300 dark:border-gray-600"
                            )}
                          />
                        ) : col.fieldDef.type === "url" && value ? (
                          <a
                            href={String(value)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {String(value).replace(/^https?:\/\//, "").slice(0, 30)}
                          </a>
                        ) : (
                          <span className="block truncate">
                            {formatCellValue(value, col.fieldDef)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
