export default function RegistryLoading() {
  return (
    <div className="space-y-10">
      <div className="h-8 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      {[1, 2].map((section) => (
        <div key={section} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-9 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
