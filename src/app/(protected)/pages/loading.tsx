export default function PagesLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
    </div>
  );
}
