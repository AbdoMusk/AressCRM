export default function PipelineLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-96 w-72 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
    </div>
  );
}
