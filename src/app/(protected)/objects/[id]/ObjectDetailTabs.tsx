"use client";

import { useState } from "react";
import { ObjectDetailView } from "@/modules/engine/components/ObjectDetailView";
import { ObjectEditForm } from "@/modules/engine/components/ObjectEditForm";
import { RelationManager } from "@/modules/engine/components/RelationManager";
import type { ObjectWithModules } from "@/modules/engine/types/object.types";
import type { RelatedObject } from "@/modules/engine/types/object.types";
import type { ModuleSchema } from "@/modules/engine/types/module.types";

interface Props {
  object: ObjectWithModules;
  relations: RelatedObject[];
  availableModules: {
    id: string;
    name: string;
    display_name: string;
    icon: string | null;
    schema: ModuleSchema;
  }[];
  requiredModuleIds: Set<string>;
}

/**
 * Client-side tab switcher for object detail: View / Edit / Relations
 */
export function ObjectDetailTabs({
  object,
  relations,
  availableModules,
  requiredModuleIds,
}: Props) {
  const [activeTab, setActiveTab] = useState<"view" | "edit" | "relations">(
    "view"
  );

  const tabs = [
    { key: "view" as const, label: "View" },
    { key: "edit" as const, label: "Edit" },
    { key: "relations" as const, label: `Relations (${relations.length})` },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "view" && <ObjectDetailView object={object} />}

      {activeTab === "edit" && (
        <ObjectEditForm
          object={object}
          availableModules={availableModules}
          requiredModuleIds={requiredModuleIds}
        />
      )}

      {activeTab === "relations" && (
        <RelationManager objectId={object.id} relations={relations} />
      )}
    </div>
  );
}
