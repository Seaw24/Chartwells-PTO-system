export function Skeleton({ className = "", rounded = "rounded-md" }) {
  return (
    <div className={`skeleton ${rounded} ${className}`} aria-hidden="true" />
  );
}
export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="rounded-card border border-line bg-card p-5">
      <Skeleton className="mb-4 h-5 w-1/3" />
      <div className="space-y-2.5">
        {Array.from({
          length: lines,
        }).map((t, n) => (
          <Skeleton className="h-3.5" rounded="rounded" key={n} />
        ))}
      </div>
    </div>
  );
}
