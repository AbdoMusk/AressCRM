"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import type { ObjectWithModules } from "@/modules/engine/types/object.types";
import type { ModuleFieldDef, SelectOption } from "@/modules/engine/types/module.types";
import { GripVertical, Plus } from "lucide-react";

// ── Types ────────────────────────────────────

interface KanbanColumn {
  value: string;
  label: string;
  color?: string;
}

interface RecordKanbanProps {
  objects: ObjectWithModules[];
  /** Module containing the kanban grouping field */
  kanbanModuleName: string;
  /** Field key used to group into columns */
  kanbanFieldKey: string;
  /** Field definition for the kanban field — used to get columns from options */
  kanbanFieldDef: ModuleFieldDef;
  /** Secondary fields to show on cards */
  cardFields?: {
    module: string;
    field: string;
    label: string;
    fieldDef: ModuleFieldDef;
  }[];
  /** Called when a record is moved between columns */
  onRecordMove?: (objectId: string, newValue: string) => void;
  /** Called when a record card is clicked */
  onRecordClick?: (objectId: string) => void;
  loading?: boolean;
}

// ── Helpers ──────────────────────────────────

function getFieldValue(
  obj: ObjectWithModules,
  moduleName: string,
  fieldKey: string
): unknown {
  const mod = obj.modules.find((m) => m.moduleName === moduleName);
  return mod?.data?.[fieldKey] ?? null;
}

function formatValue(value: unknown, fieldDef: ModuleFieldDef): string {
  if (value == null || value === "") return "—";
  switch (fieldDef.type) {
    case "number": return Number(value).toLocaleString();
    case "date":
      try { return new Date(String(value)).toLocaleDateString(); }
      catch { return String(value); }
    case "select": {
      const opt = fieldDef.options?.find((o) => o.value === value);
      return opt?.label ?? String(value);
    }
    default: return String(value);
  }
}

// ── Sub-Components ───────────────────────────

function KanbanColumnContainer({
  column,
  count,
  children,
}: {
  column: KanbanColumn;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.value}`,
    data: { column: column.value },
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex h-full w-[280px] flex-shrink-0 flex-col rounded-lg border transition-colors",
        isOver
          ? "border-blue-400 bg-blue-50/30 dark:border-blue-600 dark:bg-blue-950/20"
          : "border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30"
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-gray-800">
        {column.color && (
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: column.color }}
          />
        )}
        <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
          {column.label}
        </span>
        <span className="ml-auto rounded bg-gray-200/80 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          {count}
        </span>
      </div>
      {/* Cards */}
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {children}
      </div>
    </div>
  );
}

function KanbanCard({
  object,
  cardFields,
  onClick,
  isDragging,
}: {
  object: ObjectWithModules;
  cardFields?: RecordKanbanProps["cardFields"];
  onClick?: () => void;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortDragging,
  } = useSortable({
    id: object.id,
    data: { object },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group rounded-md border bg-white p-3 shadow-sm transition-shadow dark:bg-gray-900",
        isSortDragging || isDragging
          ? "border-blue-400 shadow-md opacity-90"
          : "border-gray-200 hover:shadow-md dark:border-gray-700 dark:hover:border-gray-600"
      )}
    >
      {/* Card header: drag handle + name */}
      <div className="flex items-start gap-1.5">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600"
        >
          <GripVertical size={14} />
        </button>
        <button
          onClick={onClick}
          className="flex-1 text-left text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
        >
          {object.displayName}
        </button>
      </div>

      {/* Card fields */}
      {cardFields && cardFields.length > 0 && (
        <div className="mt-2 space-y-1 pl-5">
          {cardFields.map((cf) => {
            const val = getFieldValue(object, cf.module, cf.field);
            if (val == null || val === "") return null;
            return (
              <div
                key={`${cf.module}.${cf.field}`}
                className="flex items-baseline justify-between gap-2 text-xs"
              >
                <span className="text-gray-400 dark:text-gray-500">
                  {cf.label}
                </span>
                <span className="truncate text-gray-600 dark:text-gray-400">
                  {formatValue(val, cf.fieldDef)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────

export function RecordKanban({
  objects,
  kanbanModuleName,
  kanbanFieldKey,
  kanbanFieldDef,
  cardFields,
  onRecordMove,
  onRecordClick,
  loading = false,
}: RecordKanbanProps) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Local copy of objects for optimistic kanban moves
  const [localObjects, setLocalObjects] = useState<ObjectWithModules[]>(objects);

  // Sync when server data changes (e.g. after page navigation)
  useEffect(() => { setLocalObjects(objects); }, [objects]);

  // Avoid hydration mismatch: DndContext generates aria-describedby IDs that
  // differ between SSR and client. Only render DndContext after mount.
  useEffect(() => { setMounted(true); }, []);

  // Build columns from field options
  const columns: KanbanColumn[] = useMemo(() => {
    if (kanbanFieldDef.type !== "select" || !kanbanFieldDef.options) return [];
    return kanbanFieldDef.options.map((opt) => ({
      value: opt.value,
      label: opt.label,
      color: opt.color,
    }));
  }, [kanbanFieldDef]);

  // Group objects into columns
  const objectsByColumn = useMemo(() => {
    const groups: Record<string, ObjectWithModules[]> = {};
    columns.forEach((c) => { groups[c.value] = []; });
    // "Uncategorized" column for objects without a valid value
    groups["__none__"] = [];

    localObjects.forEach((obj) => {
      const val = getFieldValue(obj, kanbanModuleName, kanbanFieldKey);
      const key = val != null ? String(val) : "__none__";
      if (groups[key]) {
        groups[key].push(obj);
      } else {
        groups["__none__"].push(obj);
      }
    });
    return groups;
  }, [localObjects, columns, kanbanModuleName, kanbanFieldKey]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || !onRecordMove) return;

      // Determine target column
      const overData = over.data?.current as any;
      let targetColumn: string | null = null;

      if (overData?.column) {
        // Dropped on column container
        targetColumn = overData.column;
      } else if (overData?.object) {
        // Dropped on another card — find that card's column
        const dropObj = overData.object as ObjectWithModules;
        const val = getFieldValue(dropObj, kanbanModuleName, kanbanFieldKey);
        targetColumn = val != null ? String(val) : null;
      }

      if (targetColumn && targetColumn !== "__none__") {
        // Optimistic update: move the object in local state immediately
        setLocalObjects((prev) =>
          prev.map((obj) => {
            if (obj.id !== String(active.id)) return obj;
            return {
              ...obj,
              modules: obj.modules.map((mod) => {
                if (mod.moduleName !== kanbanModuleName) return mod;
                return {
                  ...mod,
                  data: { ...mod.data, [kanbanFieldKey]: targetColumn },
                };
              }),
            };
          })
        );
        // Fire server update in the background (no await / no router.refresh)
        onRecordMove(String(active.id), targetColumn);
      }
    },
    [onRecordMove, kanbanModuleName, kanbanFieldKey]
  );

  const handleCardClick = useCallback(
    (objectId: string) => {
      if (onRecordClick) {
        onRecordClick(objectId);
      } else {
        router.push(`/record/${objectId}`);
      }
    },
    [onRecordClick, router]
  );

  const activeObject = activeId
    ? localObjects.find((o) => o.id === activeId)
    : null;

  if (loading || !mounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 gap-3 overflow-x-auto p-4">
        {/* Uncategorized column */}
        {objectsByColumn["__none__"]?.length > 0 && (
          <KanbanColumnContainer
            column={{ value: "__none__", label: "Uncategorized", color: "#9CA3AF" }}
            count={objectsByColumn["__none__"].length}
          >
            <SortableContext
              items={objectsByColumn["__none__"].map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              {objectsByColumn["__none__"].map((obj) => (
                <KanbanCard
                  key={obj.id}
                  object={obj}
                  cardFields={cardFields}
                  onClick={() => handleCardClick(obj.id)}
                />
              ))}
            </SortableContext>
          </KanbanColumnContainer>
        )}

        {/* Status columns */}
        {columns.map((col) => (
          <KanbanColumnContainer
            key={col.value}
            column={col}
            count={objectsByColumn[col.value]?.length ?? 0}
          >
            <SortableContext
              items={(objectsByColumn[col.value] ?? []).map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              {(objectsByColumn[col.value] ?? []).map((obj) => (
                <KanbanCard
                  key={obj.id}
                  object={obj}
                  cardFields={cardFields}
                  onClick={() => handleCardClick(obj.id)}
                />
              ))}
            </SortableContext>
          </KanbanColumnContainer>
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeObject && (
          <KanbanCard
            object={activeObject}
            cardFields={cardFields}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
