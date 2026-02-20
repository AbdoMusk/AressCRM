"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { tw } from "./DynamicField";
import { ModuleManager } from "./ModuleManager";
import { ObjectTypeManager } from "./ObjectTypeManager";
import { ObjectTypeDetail } from "./ObjectTypeDetail";
import type { ModuleRowTyped } from "@/modules/engine/types/module.types";
import type { ObjectTypeWithModules } from "@/modules/engine/types/object.types";
import type { ObjectTypeRelation } from "@/modules/engine/types/relation.types";
import {
  Database,
  Box,
  Layers,
  Link2,
  ChevronRight,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

// ── Types ────────────────────────────────────

interface Props {
  modules: ModuleRowTyped[];
  objectTypes: ObjectTypeWithModules[];
  relations: ObjectTypeRelation[];
}

type Tab = "objects" | "modules";
type View = "list" | "detail";

// ── Component ────────────────────────────────

export function DataModelHub({ modules, objectTypes, relations }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("objects");
  const [view, setView] = useState<View>("list");
  const [selectedObjectTypeId, setSelectedObjectTypeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const selectedObjectType = objectTypes.find((ot) => ot.id === selectedObjectTypeId);

  // Filter object types
  const filteredObjectTypes = objectTypes.filter((ot) => {
    const matchesSearch =
      !searchQuery ||
      ot.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ot.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesActive = showInactive || (ot as any).is_active !== false;
    return matchesSearch && matchesActive;
  });

  // Count fields per object type (from attached modules)
  function countFields(ot: ObjectTypeWithModules): number {
    return ot.modules.reduce((sum, m) => {
      const mod = modules.find((mod) => mod.id === m.module_id);
      return sum + (mod?.schema.fields.length ?? 0);
    }, 0);
  }

  // Get relations for a specific object type
  function getRelationsForType(typeId: string): ObjectTypeRelation[] {
    return relations.filter(
      (r) => r.source_type_id === typeId || r.target_type_id === typeId
    );
  }

  function openObjectTypeDetail(objectTypeId: string) {
    setSelectedObjectTypeId(objectTypeId);
    setView("detail");
  }

  function backToList() {
    setSelectedObjectTypeId(null);
    setView("list");
  }

  // ── Detail View ──
  if (view === "detail" && selectedObjectType) {
    return (
      <ObjectTypeDetail
        objectType={selectedObjectType}
        modules={modules}
        relations={getRelationsForType(selectedObjectType.id)}
        allObjectTypes={objectTypes}
        onBack={backToList}
      />
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Data Model
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Define and manage your CRM data structure — objects, fields, and
          relations.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("objects")}
          className={clsx(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "objects"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          )}
        >
          <Box size={16} />
          Objects
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] dark:bg-gray-800">
            {objectTypes.filter((ot) => (ot as any).is_active !== false).length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("modules")}
          className={clsx(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "modules"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          )}
        >
          <Layers size={16} />
          Modules
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] dark:bg-gray-800">
            {modules.length}
          </span>
        </button>
      </div>

      {/* Content */}
      {activeTab === "objects" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search objects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${tw.input} pl-9`}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowInactive(!showInactive)}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                showInactive
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400"
              )}
            >
              {showInactive ? (
                <ToggleRight size={14} />
              ) : (
                <ToggleLeft size={14} />
              )}
              Show inactive
            </button>
          </div>

          {/* Object Types Grid */}
          <ObjectTypeManager
            objectTypes={filteredObjectTypes}
            modules={modules}
            onSelectObjectType={openObjectTypeDetail}
          />
        </div>
      )}

      {activeTab === "modules" && <ModuleManager modules={modules} />}
    </div>
  );
}
