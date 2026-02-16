export default function LeadDetailLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div>
            <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 flex gap-2">
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700 mt-0.5" />
                  <div>
                    <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-1 h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Notes */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-6 w-20 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-6 w-28 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-1 h-5 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div>
                    <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-1 h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
