"use client";

import { useEffect, useState } from "react";
import { tw } from "./DynamicField";
import type { ObjectWithModules } from "@/modules/engine/types/object.types";
import type { ProcessorResult } from "@/modules/engine/processors/base.processor";
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  DollarSign,
  BarChart3,
  Loader2,
} from "lucide-react";

interface Props {
  object: ObjectWithModules;
}

/**
 * Shows processor insights on an object detail page.
 * Automatically runs all eligible processors and displays their results.
 */
export function ProcessorInsights({ object }: Props) {
  const [results, setResults] = useState<ProcessorResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/processors?objectId=${object.id}`);
        if (!res.ok) throw new Error("Failed to load processor insights");
        const data = await res.json();
        setResults(data.results ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [object.id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-gray-400">
        <Loader2 size={16} className="animate-spin" />
        Running processors...
      </div>
    );
  }

  if (error) {
    return <div className={tw.error}>{error}</div>;
  }

  if (results.length === 0) {
    return (
      <p className="py-4 text-sm text-gray-500">
        No processors are eligible for this object&apos;s module composition.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result, i) => (
        <ProcessorCard key={i} result={result} />
      ))}
    </div>
  );
}

function ProcessorCard({ result }: { result: ProcessorResult }) {
  if (!result.success) {
    return (
      <div className={`${tw.card} border-red-200 dark:border-red-800`}>
        <div className="flex items-center gap-2 text-red-600">
          <XCircle size={16} />
          <span className="text-sm font-medium">{result.processor}</span>
        </div>
        <p className="mt-1 text-xs text-red-500">{result.error}</p>
      </div>
    );
  }

  switch (result.processor) {
    case "reporting":
      return <ReportingCard data={result.data as any} />;
    case "ticket":
      return <TicketCard data={result.data as any} />;
    case "project":
      return <ProjectCard data={result.data as any} />;
    default:
      return <GenericCard result={result} />;
  }
}

function ReportingCard({ data }: { data: any }) {
  return (
    <div className={tw.card}>
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-green-50 p-1.5 text-green-600 dark:bg-green-950 dark:text-green-400">
          <DollarSign size={16} />
        </div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Revenue Insights
        </h4>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InsightMetric label="Value" value={`${data.currency} ${Number(data.value).toLocaleString()}`} />
        <InsightMetric
          label="Weighted"
          value={`${data.currency} ${Number(data.weightedValue).toLocaleString()}`}
        />
        <InsightMetric
          label="Stage"
          value={data.stage ?? "N/A"}
          color={data.isWon ? "text-green-600" : data.isClosed ? "text-red-600" : "text-blue-600"}
        />
        <InsightMetric
          label="Status"
          value={data.isWon ? "Won" : data.isClosed ? "Closed" : "Open"}
          icon={
            data.isWon ? (
              <CheckCircle2 size={14} className="text-green-500" />
            ) : data.isClosed ? (
              <XCircle size={14} className="text-red-500" />
            ) : (
              <Activity size={14} className="text-blue-500" />
            )
          }
        />
      </div>
      {data.attribution?.name && (
        <p className="mt-2 text-xs text-gray-500">
          Attribution: {data.attribution.name}
          {data.attribution.email && ` (${data.attribution.email})`}
        </p>
      )}
    </div>
  );
}

function TicketCard({ data }: { data: any }) {
  return (
    <div className={tw.card}>
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-purple-50 p-1.5 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
          <Target size={16} />
        </div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Lifecycle & Status
        </h4>
        {data.isStale && (
          <span className="ml-auto flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle size={12} />
            Stale ({data.ageDays}d)
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InsightMetric
          label="Current Stage"
          value={data.currentStage}
          color={data.isTerminal ? "text-gray-500" : "text-blue-600"}
        />
        <InsightMetric
          label="Priority"
          value={data.priority}
          color={
            data.priority === "urgent"
              ? "text-red-600"
              : data.priority === "high"
                ? "text-orange-600"
                : "text-gray-600"
          }
        />
        <InsightMetric label="Age" value={`${data.ageDays} days`} />
        <InsightMetric
          label="Terminal"
          value={data.isTerminal ? "Yes" : "No"}
          icon={
            data.isTerminal ? (
              <CheckCircle2 size={14} className="text-green-500" />
            ) : (
              <Clock size={14} className="text-blue-500" />
            )
          }
        />
      </div>
      {data.validTransitions.length > 0 && !data.isTerminal && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-gray-500">
            Valid Transitions:
          </p>
          <div className="flex flex-wrap gap-1">
            {data.validTransitions.map((t: string) => (
              <span
                key={t}
                className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ data }: { data: any }) {
  const healthColors = {
    healthy: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400",
    "at-risk": "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400",
    critical: "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400",
  };

  return (
    <div className={tw.card}>
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          <BarChart3 size={16} />
        </div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Project Health
        </h4>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${healthColors[data.healthLabel as keyof typeof healthColors] ?? ""}`}
        >
          {data.healthLabel} ({data.healthScore}/100)
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InsightMetric label="Organization" value={data.organizationName} />
        <InsightMetric label="Status" value={data.status} />
        <InsightMetric
          label="Completeness"
          value={`${data.completeness.percentage}%`}
        />
        {data.hasBudget && (
          <InsightMetric
            label="Budget"
            value={`$${Number(data.budgetAmount ?? 0).toLocaleString()}`}
          />
        )}
      </div>
      {/* Health bar */}
      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-full rounded-full transition-all ${
              data.healthScore >= 60
                ? "bg-green-500"
                : data.healthScore >= 30
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${data.healthScore}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function GenericCard({ result }: { result: ProcessorResult }) {
  if (!result.success) return null;
  return (
    <div className={tw.card}>
      <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
        {result.processor}
      </h4>
      <pre className="max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs dark:bg-gray-800">
        {JSON.stringify(result.data, null, 2)}
      </pre>
    </div>
  );
}

function InsightMetric({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <div className="flex items-center gap-1">
        {icon}
        <p
          className={`text-sm font-medium ${color ?? "text-gray-900 dark:text-white"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
