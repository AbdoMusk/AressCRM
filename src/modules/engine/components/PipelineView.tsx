"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tw } from "./DynamicField";
import { updateObjectModuleAction } from "@/modules/engine/actions/object.actions";
import type { SelectOption } from "@/modules/engine/types/module.types";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  DollarSign,
  User,
  Clock,
  ExternalLink,
} from "lucide-react";

interface PipelineObject {
  id: string;
  displayName: string;
  objectType: string;
  status: string;
  stageModuleId: string;
  monetaryValue?: number;
  monetaryCurrency?: string;
  assignedTo?: string;
  createdAt: string;
  priority?: string;
}

interface PipelineViewProps {
  objects: PipelineObject[];
  statusOptions: SelectOption[];
  objectTypeName?: string;
}

/**
 * Kanban-style pipeline view with drag-and-drop between columns.
 * Cards can be dragged between status columns. Each card has a detail button.
 */
export function PipelineView({
  objects,
  statusOptions,
  objectTypeName,
}: PipelineViewProps) {
  const router = useRouter();
  const [moving, setMoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  /** Optimistic overrides: objectId → newStatus */
  const [optimisticMoves, setOptimisticMoves] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Apply optimistic status overrides
  const effectiveObjects = objects.map((o) =>
    optimisticMoves[o.id] ? { ...o, status: optimisticMoves[o.id] } : o
  );

  // Group objects by status
  const columns = statusOptions.map((opt) => ({
    ...opt,
    objects: effectiveObjects.filter((o) => o.status === opt.value),
  }));

  // Add "unknown" column for objects with status not in options
  const knownStatuses = new Set(statusOptions.map((o) => o.value));
  const unknownObjects = effectiveObjects.filter((o) => !knownStatuses.has(o.status));
  if (unknownObjects.length > 0) {
    columns.push({
      value: "unknown",
      label: "Other",
      color: "#6B7280",
      objects: unknownObjects,
    });
  }

  const activeObject = activeId ? effectiveObjects.find((o) => o.id === activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const objectId = String(active.id);
      const newStatus = String(over.id);

      const obj = objects.find((o) => o.id === objectId);
      if (!obj || obj.status === newStatus) return;

      // Optimistic update — move card immediately
      setOptimisticMoves((prev) => ({ ...prev, [objectId]: newStatus }));
      setMoving(objectId);
      setError(null);

      try {
        const result = await updateObjectModuleAction(objectId, obj.stageModuleId, {
          status: newStatus,
        });

        if (!result.success) {
          // Revert optimistic move
          setOptimisticMoves((prev) => {
            const next = { ...prev };
            delete next[objectId];
            return next;
          });
          setError(result.error ?? "Failed to move object");
          return;
        }

        // Clear optimistic override — real data will arrive via refresh
        setOptimisticMoves((prev) => {
          const next = { ...prev };
          delete next[objectId];
          return next;
        });
        router.refresh();
      } catch (err: unknown) {
        // Revert optimistic move
        setOptimisticMoves((prev) => {
          const next = { ...prev };
          delete next[objectId];
          return next;
        });
        setError(err instanceof Error ? err.message : "Failed to move");
      } finally {
        setMoving(null);
      }
    },
    [objects, router]
  );

  return (
    <div className="space-y-3">
      {error && <div className={tw.error}>{error}</div>}

      {/* Summary row */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>{objects.length} objects in pipeline</span>
        {objectTypeName && (
          <span className="text-xs text-gray-400">({objectTypeName})</span>
        )}
        <span className="text-xs text-gray-400">
          Drag cards between columns to change status
        </span>
      </div>

      {/* Kanban columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map((col) => (
            <DroppableColumn key={col.value} id={col.value} label={col.label} color={col.color} count={col.objects.length}>
              {col.objects.map((obj) => (
                <DraggableCard
                  key={obj.id}
                  object={obj}
                  isMoving={moving === obj.id}
                  isDragging={activeId === obj.id}
                />
              ))}
              {col.objects.length === 0 && (
                <p className="py-8 text-center text-xs text-gray-400">
                  Drop here
                </p>
              )}
            </DroppableColumn>
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeObject ? (
            <PipelineCardContent object={activeObject} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ── Droppable Column ─────────────────────────

function DroppableColumn({
  id,
  label,
  color,
  count,
  children,
}: {
  id: string;
  label: string;
  color?: string;
  count: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 flex-shrink-0 flex-col rounded-xl border bg-gray-50 transition-colors dark:bg-gray-900/50 ${
        isOver
          ? "border-blue-400 bg-blue-50/50 dark:border-blue-600 dark:bg-blue-950/30"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: color ?? "#6B7280" }}
        />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {label}
        </span>
        <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: "65vh" }}>
        {children}
      </div>
    </div>
  );
}

// ── Draggable Card ───────────────────────────

function DraggableCard({
  object,
  isMoving,
  isDragging,
}: {
  object: PipelineObject;
  isMoving: boolean;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: object.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition dark:border-gray-800 dark:bg-gray-900 ${
        isMoving ? "opacity-50" : ""
      } ${isDragging ? "opacity-30" : "cursor-grab hover:shadow-md active:cursor-grabbing"}`}
    >
      <PipelineCardContent object={object} />
    </div>
  );
}

// ── Card Content (shared between card and overlay) ──

function PipelineCardContent({
  object,
  isOverlay = false,
}: {
  object: PipelineObject;
  isOverlay?: boolean;
}) {
  const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div
      className={
        isOverlay
          ? "w-64 rounded-lg border border-blue-300 bg-white p-3 shadow-xl dark:border-blue-700 dark:bg-gray-900"
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {object.displayName}
        </span>
        {!isOverlay && (
          <Link
            href={`/objects/${object.id}`}
            className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} />
          </Link>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {object.objectType && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
            {object.objectType}
          </span>
        )}
        {object.priority && (
          <span
            className={`rounded px-1.5 py-0.5 text-xs ${priorityColors[object.priority] ?? priorityColors.medium}`}
          >
            {object.priority}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        {object.monetaryValue != null && (
          <span className="flex items-center gap-0.5">
            <DollarSign size={10} />
            {object.monetaryCurrency ?? "USD"}{" "}
            {object.monetaryValue.toLocaleString()}
          </span>
        )}
        {object.assignedTo && (
          <span className="flex items-center gap-0.5">
            <User size={10} />
            {object.assignedTo}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
        <Clock size={10} />
        {new Date(object.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
