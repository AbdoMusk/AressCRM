import { Users, TrendingUp, BarChart3 } from "lucide-react";

interface StatusData {
  name: string;
  color: string;
  count: number;
}

interface Props {
  total: number;
  conversionRate: number;
  byStatus: StatusData[];
}

export function StatsCards({ total, conversionRate, byStatus }: Props) {
  const topStatuses = byStatus.slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Leads */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <Users size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Leads
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {total}
            </p>
          </div>
        </div>
      </div>

      {/* Conversion Rate */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-100 p-2 text-green-600 dark:bg-green-950 dark:text-green-400">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Conversion Rate
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {conversionRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Top statuses */}
      {topStatuses.map((status) => (
        <div
          key={status.name}
          className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3">
            <div
              className="rounded-lg p-2"
              style={{ backgroundColor: status.color + "20", color: status.color }}
            >
              <BarChart3 size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {status.name}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {status.count}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
