"use client";

import Link from "next/link";
import { tw } from "./DynamicField";
import type { DashboardStats } from "@/modules/engine/services/query.service";
import {
  BarChart3,
  Clock,
  Hash,
  DollarSign,
  TrendingUp,
  Target,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

// ── Types ────────────────────────────────────

interface PipelineItem {
  status: string;
  count: number;
  color: string;
}

interface MonetarySummary {
  totalValue: number;
  avgValue: number;
  totalWeighted: number;
  dealCount: number;
  currency: string;
}

interface ConversionData {
  wonCount: number;
  lostCount: number;
  totalClosed: number;
  rate: number;
}

interface MonthlyData {
  month: string;
  count: number;
}

interface EnhancedDashboardProps {
  stats: DashboardStats;
  pipeline?: PipelineItem[];
  monetary?: MonetarySummary;
  conversion?: ConversionData;
  monthly?: MonthlyData[];
  statusDistribution?: PipelineItem[];
}

export function EnhancedDashboardView({
  stats,
  pipeline = [],
  monetary,
  conversion,
  monthly = [],
  statusDistribution = [],
}: EnhancedDashboardProps) {
  return (
    <div className="space-y-6">
      {/* ── Row 1: Key Metrics ─────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Objects"
          value={stats.totalObjects.toLocaleString()}
          icon={<Hash size={18} />}
          color="blue"
        />
        {monetary && (
          <>
            <StatCard
              label="Total Pipeline"
              value={`${monetary.currency} ${monetary.totalValue.toLocaleString()}`}
              icon={<DollarSign size={18} />}
              color="green"
              subtitle={`${monetary.dealCount} deals`}
            />
            <StatCard
              label="Weighted Pipeline"
              value={`${monetary.currency} ${monetary.totalWeighted.toLocaleString()}`}
              icon={<TrendingUp size={18} />}
              color="purple"
              subtitle={`Avg: ${monetary.currency} ${monetary.avgValue.toLocaleString()}`}
            />
          </>
        )}
        {conversion && (
          <StatCard
            label="Conversion Rate"
            value={`${conversion.rate}%`}
            icon={<Target size={18} />}
            color={conversion.rate >= 50 ? "green" : conversion.rate >= 25 ? "amber" : "red"}
            subtitle={`${conversion.wonCount} won / ${conversion.totalClosed} closed`}
          />
        )}
        {!monetary && !conversion && (
          <>
            {stats.objectCounts.slice(0, 3).map((oc) => (
              <StatCard
                key={oc.objectTypeId}
                label={oc.displayName}
                value={oc.count.toLocaleString()}
                icon={<Users size={18} />}
                color="gray"
              />
            ))}
          </>
        )}
      </div>

      {/* ── Row 2: Object Type Counts ──────────── */}
      {stats.objectCounts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Object counts by type - Bar Chart */}
          <div className={tw.card}>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              <BarChart3 size={14} className="mr-1 inline" />
              Objects by Type
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.objectCounts.map((oc) => ({
                    name: oc.displayName,
                    count: oc.count,
                    fill: oc.color,
                  }))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tick={{ fill: "#9CA3AF" }}
                  />
                  <YAxis fontSize={12} tick={{ fill: "#9CA3AF" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.objectCounts.map((oc, i) => (
                      <Cell key={i} fill={oc.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline Distribution - Pie Chart */}
          {pipeline.length > 0 && (
            <div className={tw.card}>
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                <Target size={14} className="mr-1 inline" />
                Pipeline Distribution
              </h3>
              <div className="flex h-56 items-center">
                <div className="h-full w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pipeline}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                      >
                        {pipeline.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-1">
                  {pipeline.map((item) => (
                    <div key={item.status} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1 text-gray-600 dark:text-gray-400">
                        {item.status}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Row 3: Monthly Evolution & Recent Objects ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Monthly evolution */}
        {monthly.length > 0 && (
          <div className={tw.card}>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              <TrendingUp size={14} className="mr-1 inline" />
              Monthly Object Creation
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthly}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    dataKey="month"
                    fontSize={12}
                    tick={{ fill: "#9CA3AF" }}
                    tickFormatter={(v) => {
                      const [, m] = v.split("-");
                      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      return months[parseInt(m) - 1] ?? v;
                    }}
                  />
                  <YAxis fontSize={12} tick={{ fill: "#9CA3AF" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#fff",
                    }}
                  />
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    fill="url(#colorCount)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Objects */}
        {stats.recentObjects.length > 0 && (
          <div className={tw.card}>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              <Clock size={14} className="mr-1 inline" />
              Recent Objects
            </h3>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.recentObjects.map((obj) => (
                <li
                  key={obj.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <Link
                      href={`/objects/${obj.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {obj.displayName}
                    </Link>
                    <span className="ml-2 text-xs text-gray-400">
                      {obj.objectType}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(obj.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ── StatCard ─────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-600 dark:text-blue-400" },
  green: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-600 dark:text-green-400" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950", text: "text-purple-600 dark:text-purple-400" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-600 dark:text-amber-400" },
  red: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-600 dark:text-red-400" },
  gray: { bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400" },
};

function StatCard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  const colors = COLOR_MAP[color] ?? COLOR_MAP.gray;

  return (
    <div className={tw.card}>
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colors.bg} ${colors.text}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="truncate text-xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
