"use client";

import Link from "next/link";
import { tw } from "./DynamicField";
import type { DashboardStats } from "@/modules/engine/services/query.service";
import { BarChart3, Clock, Hash } from "lucide-react";

interface Props {
  stats: DashboardStats;
}

export function DashboardView({ stats }: Props) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Objects"
          value={stats.totalObjects}
          icon={<Hash size={18} />}
          color="blue"
        />
        {stats.objectCounts.slice(0, 3).map((oc) => (
          <StatCard
            key={oc.objectTypeId}
            label={oc.displayName}
            value={oc.count}
            icon={oc.icon ? <span>{oc.icon}</span> : <BarChart3 size={18} />}
            color="gray"
          />
        ))}
      </div>

      {/* Object counts by type */}
      {stats.objectCounts.length > 0 && (
        <div className={tw.card}>
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Objects by Type
          </h3>
          <div className="space-y-2">
            {stats.objectCounts.map((oc) => {
              const maxCount = Math.max(
                ...stats.objectCounts.map((c) => c.count),
                1
              );
              const pct = (oc.count / maxCount) * 100;
              return (
                <div key={oc.objectTypeId} className="flex items-center gap-3">
                  <div className="flex w-32 items-center gap-1">
                    {oc.icon && <span className="text-sm">{oc.icon}</span>}
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {oc.displayName}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {oc.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent objects */}
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
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={tw.card}>
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
