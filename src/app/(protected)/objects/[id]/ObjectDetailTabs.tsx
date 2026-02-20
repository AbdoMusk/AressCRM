"use client";

import { useState } from "react";
import { ObjectDetailView } from "@/modules/engine/components/ObjectDetailView";
import { ObjectEditForm } from "@/modules/engine/components/ObjectEditForm";
import { RelationManager } from "@/modules/engine/components/RelationManager";
import { Timeline } from "@/modules/engine/components/Timeline";
import { ProcessorInsights } from "@/modules/engine/components/ProcessorInsights";
import type { ObjectWithModules } from "@/modules/engine/types/object.types";
import type { RelatedObject } from "@/modules/engine/types/object.types";
import type { ModuleSchema } from "@/modules/engine/types/module.types";
import type { TimelineEvent } from "@/modules/engine/services/timeline.service";

type TabKey = "view" | "edit" | "relations" | "timeline" | "insights";

interface Props {
  object: ObjectWithModules;
  relations: RelatedObject[];
  timelineEvents: TimelineEvent[];
  availableModules: {
    id: string;
    name: string;
    display_name: string;
    icon: string | null;
    schema: ModuleSchema;
  }[];
  requiredModuleIds: string[];
}

/**
 * Client-side tab switcher for object detail: View / Edit / Relations / Timeline / Insights
 */
export function ObjectDetailTabs({
  object,
  relations,
  timelineEvents,
  availableModules,
  requiredModuleIds,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("view");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "view", label: "View" },
    { key: "edit", label: "Edit" },
    { key: "relations", label: `Relations (${relations.length})` },
    { key: "timeline", label: `Timeline (${timelineEvents.length})` },
    { key: "insights", label: "Insights" },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition ${
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

      {activeTab === "timeline" && (
        <Timeline objectId={object.id} events={timelineEvents} />
      )}

      {activeTab === "insights" && (
        <ProcessorInsights object={object} />
      )}
    </div>
  );
}
