"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tw } from "./DynamicField";
import { addWidgetAction, removeWidgetAction, updateWidgetAction } from "@/modules/engine/actions/page.actions";
import type { Page, PageWidget, WidgetConfig } from "@/modules/engine/services/page.service";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import {
  Plus,
  Trash2,
  BarChart3,
  Hash,
  List,
  Target,
  Clock,
  Zap,
  X,
  Pencil,
  Download,
  Table,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

interface PageRendererProps {
  page: Page;
  /** Pre-fetched data for widgets */
  widgetData: Record<string, any>;
  objectTypes: { id: string; name: string; display_name: string }[];
  isOwner: boolean;
}

/**
 * Renders a custom page with its widgets in a grid layout.
 */
export function PageRenderer({
  page,
  widgetData,
  objectTypes,
  isOwner,
}: PageRendererProps) {
  const router = useRouter();
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [editingWidget, setEditingWidget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRemoveWidget(widgetId: string) {
    setError(null);
    const result = await removeWidgetAction(widgetId);
    if (!result.success) {
      setError(result.error ?? "Failed to remove widget");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {page.name}
          </h1>
          {page.description && (
            <p className="text-sm text-gray-500">{page.description}</p>
          )}
        </div>
        {isOwner && (
          <button
            onClick={() => setShowAddWidget(!showAddWidget)}
            className={tw.btnPrimary}
          >
            <Plus size={14} className="mr-1 inline" />
            Add Widget
          </button>
        )}
      </div>

      {error && <div className={tw.error}>{error}</div>}

      {/* Add widget form */}
      {showAddWidget && isOwner && (
        <AddWidgetForm
          pageId={page.id}
          objectTypes={objectTypes}
          onClose={() => setShowAddWidget(false)}
        />
      )}

      {/* Widget grid */}
      {page.widgets.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <BarChart3 size={32} className="mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">
            No widgets yet. {isOwner ? "Click 'Add Widget' to get started." : ""}
          </p>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${page.layout.columns}, minmax(0, 1fr))`,
          }}
        >
          {page.widgets.map((widget) => (
            <div
              key={widget.id}
              className={tw.card}
              style={{
                gridColumn: `span ${Math.min(widget.width, page.layout.columns)}`,
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {widget.title}
                </h3>
                {isOwner && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingWidget(editingWidget === widget.id ? null : widget.id)}
                      className="rounded p-1 text-gray-400 hover:text-blue-500"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveWidget(widget.id)}
                      className="rounded p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Edit inline */}
              {editingWidget === widget.id && isOwner && (
                <EditWidgetForm
                  widget={widget}
                  objectTypes={objectTypes}
                  onClose={() => setEditingWidget(null)}
                />
              )}

              <WidgetRenderer widget={widget} data={widgetData[widget.id]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Widget Renderer ──────────────────────────

function WidgetRenderer({
  widget,
  data,
}: {
  widget: PageWidget;
  data: any;
}) {
  if (!data) {
    return (
      <p className="py-4 text-center text-xs text-gray-400">No data available</p>
    );
  }

  switch (widget.widgetType) {
    case "stat_card":
      return <StatCardWidget data={data} config={widget.config} />;
    case "chart":
      return <ChartWidget data={data} config={widget.config} />;
    case "object_list":
      return <ObjectListWidget data={data} />;
    case "pipeline":
      return <PipelineWidget data={data} />;
    case "timeline":
      return <TimelineWidget data={data} />;
    case "table_view":
      return <TableViewWidget data={data} />;
    case "processor_report":
      return <ProcessorReportWidget data={data} />;
    default:
      return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
  }
}

function StatCardWidget({ data, config }: { data: any; config: WidgetConfig }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
        <Hash size={20} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
          {typeof data.value === "number" ? data.value.toLocaleString() : String(data.value)}
        </p>
        {data.subtitle && (
          <p className="text-xs text-gray-400">{data.subtitle}</p>
        )}
      </div>
    </div>
  );
}

function ChartWidget({ data, config }: { data: any; config: WidgetConfig }) {
  const chartData = data.items ?? data ?? [];
  const chartType = config.chartType ?? "bar";

  if (!Array.isArray(chartData) || chartData.length === 0) {
    return <p className="py-4 text-center text-xs text-gray-400">No chart data</p>;
  }

  const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "pie" ? (
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="value"
              cx="50%"
              cy="50%"
              outerRadius={70}
              innerRadius={35}
              label={({ value: v }) => v}
            >
              {chartData.map((_: any, i: number) => (
                <Cell key={i} fill={_.color ?? COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="value" fontSize={11} tick={{ fill: "#9CA3AF" }} />
            <YAxis fontSize={11} tick={{ fill: "#9CA3AF" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                color: "#fff",
              }}
            />
            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]}>
              {chartData.map((_: any, i: number) => (
                <Cell key={i} fill={_.color ?? COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function ObjectListWidget({ data }: { data: any }) {
  const objects = data.objects ?? [];
  return (
    <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
      {objects.map((obj: any) => (
        <li key={obj.id} className="flex items-center justify-between py-2">
          <Link
            href={`/objects/${obj.id}`}
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {obj.displayName}
          </Link>
          <span className="text-xs text-gray-400">{obj.objectType ?? obj.type}</span>
        </li>
      ))}
      {objects.length === 0 && (
        <li className="py-4 text-center text-xs text-gray-400">No objects</li>
      )}
    </ul>
  );
}

function PipelineWidget({ data }: { data: any }) {
  const items = data.items ?? data ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="py-4 text-center text-xs text-gray-400">No pipeline data</p>;
  }

  const total = items.reduce((sum: number, i: any) => sum + (i.count ?? 0), 0);

  return (
    <div className="space-y-2">
      {items.map((item: any) => {
        const pct = total > 0 ? (item.count / total) * 100 : 0;
        return (
          <div key={item.status ?? item.value} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color ?? "#6B7280" }}
            />
            <span className="w-24 text-xs text-gray-600 dark:text-gray-400">
              {item.status ?? item.value}
            </span>
            <div className="flex-1">
              <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: item.color ?? "#3B82F6",
                  }}
                />
              </div>
            </div>
            <span className="w-8 text-right text-xs font-medium text-gray-900 dark:text-white">
              {item.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ProcessorReportWidget({ data }: { data: any }) {
  if (!data || typeof data !== "object") {
    return <p className="py-4 text-center text-xs text-gray-400">No report data</p>;
  }

  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">{key}</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {typeof value === "number" ? value.toLocaleString() : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Timeline Widget ──────────────────────────

function TimelineWidget({ data }: { data: any }) {
  const events = data?.events ?? [];
  if (events.length === 0) {
    return <p className="py-4 text-center text-xs text-gray-400">No timeline events</p>;
  }

  const typeColors: Record<string, string> = {
    status_change: "bg-blue-500",
    note: "bg-green-500",
    relation_added: "bg-purple-500",
    relation_removed: "bg-red-500",
  };

  return (
    <div className="max-h-64 space-y-3 overflow-y-auto">
      {events.map((ev: any) => (
        <div key={ev.id} className="flex gap-3">
          <div className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${typeColors[ev.eventType] ?? "bg-gray-400"}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {ev.title}
            </p>
            {ev.description && (
              <p className="text-xs text-gray-500">{ev.description}</p>
            )}
            <p className="mt-0.5 text-xs text-gray-400">
              {new Date(ev.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Table View Widget ────────────────────────

function TableViewWidget({ data }: { data: any }) {
  const rows: any[] = data?.rows ?? [];
  const columns: string[] = data?.columns ?? [];
  const [filter, setFilter] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  if (rows.length === 0) {
    return <p className="py-4 text-center text-xs text-gray-400">No data</p>;
  }

  // Filter
  const filtered = filter
    ? rows.filter((row) =>
        Object.values(row).some((v) =>
          String(v ?? "").toLowerCase().includes(filter.toLowerCase())
        )
      )
    : rows;

  // Sort
  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const va = String(a[sortCol] ?? "");
        const vb = String(b[sortCol] ?? "");
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      })
    : filtered;

  function handleExport(format: "csv" | "text") {
    let content = "";
    if (format === "csv") {
      content = columns.join(",") + "\n" + sorted.map((r) => columns.map((c) => `"${String(r[c] ?? "")}"`).join(",")).join("\n");
    } else {
      content = sorted.map((r) => columns.map((c) => `${c}: ${String(r[c] ?? "")}`).join(" | ")).join("\n");
    }
    const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export.${format === "csv" ? "csv" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2 top-2 text-gray-400" />
          <input
            className="w-full rounded border border-gray-200 bg-gray-50 py-1.5 pl-7 pr-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            placeholder="Filter rows…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <button onClick={() => handleExport("csv")} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
          <Download size={12} className="mr-1 inline" />CSV
        </button>
        <button onClick={() => handleExport("text")} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
          <FileText size={12} className="mr-1 inline" />TXT
        </button>
      </div>

      {/* Table */}
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {columns.map((col) => (
                <th
                  key={col}
                  className="cursor-pointer whitespace-nowrap px-2 py-1.5 text-left font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => {
                    if (sortCol === col) setSortAsc(!sortAsc);
                    else { setSortCol(col); setSortAsc(true); }
                  }}
                >
                  {col.split(".").pop()}
                  {sortCol === col && (
                    sortAsc ? <ChevronUp size={10} className="ml-0.5 inline" /> : <ChevronDown size={10} className="ml-0.5 inline" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 50).map((row, i) => (
              <tr key={row.id ?? i} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900">
                {columns.map((col) => (
                  <td key={col} className="whitespace-nowrap px-2 py-1.5 text-gray-700 dark:text-gray-300">
                    {col === "type" ? (
                      row.id ? (
                        <Link href={`/objects/${row.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                          {String(row[col] ?? "")}
                        </Link>
                      ) : String(row[col] ?? "")
                    ) : col === "created" ? (
                      new Date(row[col]).toLocaleDateString()
                    ) : (
                      String(row[col] ?? "—")
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-right text-xs text-gray-400">{sorted.length} rows</p>
    </div>
  );
}

// ── Edit Widget Form ─────────────────────────

function EditWidgetForm({
  widget,
  objectTypes,
  onClose,
}: {
  widget: PageWidget;
  objectTypes: { id: string; name: string; display_name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(widget.title);
  const [config, setConfig] = useState<WidgetConfig>(widget.config);
  const [width, setWidth] = useState(widget.width);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await updateWidgetAction(widget.id, {
      title: title.trim(),
      config,
      width,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to update widget");
      setLoading(false);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="mb-3 space-y-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
      {error && <div className={tw.error}>{error}</div>}
      <div>
        <label className={tw.label}>Title</label>
        <input className={tw.input} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      {(widget.widgetType === "stat_card" || widget.widgetType === "chart") && (
        <>
          <div>
            <label className={tw.label}>Module Name</label>
            <input className={tw.input} value={config.moduleName ?? ""} onChange={(e) => setConfig({ ...config, moduleName: e.target.value })} placeholder="e.g. stage, monetary" />
          </div>
          <div>
            <label className={tw.label}>Field Key</label>
            <input className={tw.input} value={config.fieldKey ?? ""} onChange={(e) => setConfig({ ...config, fieldKey: e.target.value })} placeholder="e.g. status, amount" />
          </div>
        </>
      )}
      {(widget.widgetType === "object_list" || widget.widgetType === "pipeline" || widget.widgetType === "table_view") && (
        <div>
          <label className={tw.label}>Object Type</label>
          <select className={tw.input} value={config.objectType ?? ""} onChange={(e) => setConfig({ ...config, objectType: e.target.value })}>
            <option value="">All types</option>
            {objectTypes.map((ot) => (
              <option key={ot.id} value={ot.name}>{ot.display_name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className={tw.label}>Width</label>
        <select className={tw.input} value={width} onChange={(e) => setWidth(Number(e.target.value))}>
          <option value={1}>1 column</option>
          <option value={2}>2 columns</option>
          <option value={3}>3 columns</option>
          <option value={4}>Full width</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={tw.btnSecondary}>Cancel</button>
        <button type="submit" disabled={loading} className={tw.btnPrimary}>
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

// ── Add Widget Form ──────────────────────────

function AddWidgetForm({
  pageId,
  objectTypes,
  onClose,
}: {
  pageId: string;
  objectTypes: { id: string; name: string; display_name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [widgetType, setWidgetType] = useState<PageWidget["widgetType"]>("stat_card");
  const [title, setTitle] = useState("");
  const [config, setConfig] = useState<WidgetConfig>({});
  const [width, setWidth] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const widgetTypes = [
    { value: "stat_card", label: "Stat Card", description: "Single metric value" },
    { value: "chart", label: "Chart", description: "Bar or pie chart from module data" },
    { value: "object_list", label: "Object List", description: "List of objects by type" },
    { value: "pipeline", label: "Pipeline", description: "Status distribution view" },
    { value: "timeline", label: "Timeline", description: "Recent timeline events" },
    { value: "table_view", label: "Table View", description: "Filterable table with export" },
    { value: "processor_report", label: "Processor Report", description: "Run a processor on objects" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    const result = await addWidgetAction({
      pageId,
      widgetType,
      title: title.trim(),
      config,
      width,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to add widget");
      setLoading(false);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className={tw.card}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Add Widget
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <div className={tw.error}>{error}</div>}

        <div>
          <label className={tw.label}>Widget Type</label>
          <select
            className={tw.input}
            value={widgetType}
            onChange={(e) => setWidgetType(e.target.value as any)}
          >
            {widgetTypes.map((wt) => (
              <option key={wt.value} value={wt.value}>
                {wt.label} — {wt.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={tw.label}>Title</label>
          <input
            className={tw.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Widget title"
            required
          />
        </div>

        {/* Config fields based on widget type */}
        {(widgetType === "stat_card" || widgetType === "chart") && (
          <>
            <div>
              <label className={tw.label}>Module Name</label>
              <input
                className={tw.input}
                value={config.moduleName ?? ""}
                onChange={(e) => setConfig({ ...config, moduleName: e.target.value })}
                placeholder="e.g. stage, monetary"
              />
            </div>
            <div>
              <label className={tw.label}>Field Key</label>
              <input
                className={tw.input}
                value={config.fieldKey ?? ""}
                onChange={(e) => setConfig({ ...config, fieldKey: e.target.value })}
                placeholder="e.g. status, amount"
              />
            </div>
          </>
        )}

        {widgetType === "chart" && (
          <div>
            <label className={tw.label}>Chart Type</label>
            <select
              className={tw.input}
              value={config.chartType ?? "bar"}
              onChange={(e) => setConfig({ ...config, chartType: e.target.value as any })}
            >
              <option value="bar">Bar</option>
              <option value="pie">Pie</option>
            </select>
          </div>
        )}

        {(widgetType === "object_list" || widgetType === "pipeline") && (
          <div>
            <label className={tw.label}>Object Type</label>
            <select
              className={tw.input}
              value={config.objectType ?? ""}
              onChange={(e) => setConfig({ ...config, objectType: e.target.value })}
            >
              <option value="">All types</option>
              {objectTypes.map((ot) => (
                <option key={ot.id} value={ot.name}>
                  {ot.display_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {widgetType === "stat_card" && (
          <div>
            <label className={tw.label}>Aggregation</label>
            <select
              className={tw.input}
              value={config.aggType ?? "count"}
              onChange={(e) => setConfig({ ...config, aggType: e.target.value as any })}
            >
              <option value="count">Count</option>
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
            </select>
          </div>
        )}

        <div>
          <label className={tw.label}>Width (columns)</label>
          <select
            className={tw.input}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          >
            <option value={1}>1 column</option>
            <option value={2}>2 columns (full width)</option>
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={tw.btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={tw.btnPrimary}>
            {loading ? "Adding…" : "Add Widget"}
          </button>
        </div>
      </form>
    </div>
  );
}
