function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className || ""}`} />;
}

export function CardGridSkeleton({ count = 3, cardHeight = "h-44" }: { count?: number; cardHeight?: string }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${cardHeight} rounded-xl border border-border/50 bg-card p-6 space-y-4`}
          style={{ animationDelay: `${i * 100}ms`, animation: "fade-in-up 0.4s ease-out both" }}
        >
          <div className="flex items-start justify-between">
            <ShimmerBlock className="h-10 w-10 rounded-lg" />
            <ShimmerBlock className="h-4 w-4 rounded" />
          </div>
          <ShimmerBlock className="h-5 w-3/4 rounded-md" />
          <ShimmerBlock className="h-4 w-full rounded-md" />
          <ShimmerBlock className="h-4 w-1/2 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SubjectListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4"
          style={{ animationDelay: `${i * 80}ms`, animation: "fade-in-up 0.4s ease-out both" }}
        >
          <ShimmerBlock className="h-11 w-11 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="h-4 w-1/3 rounded-md" />
            <ShimmerBlock className="h-3 w-2/3 rounded-md" />
          </div>
          <ShimmerBlock className="h-4 w-4 shrink-0 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TopicGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 max-w-3xl">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-4"
          style={{ animationDelay: `${i * 80}ms`, animation: "fade-in-up 0.4s ease-out both" }}
        >
          <ShimmerBlock className="h-7 w-7 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="h-4 w-2/5 rounded-md" />
            <ShimmerBlock className="h-3 w-4/5 rounded-md" />
          </div>
          <ShimmerBlock className="h-4 w-4 shrink-0 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SubtopicGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-64 rounded-xl border border-border/50 bg-card p-6 space-y-4"
          style={{ animationDelay: `${i * 100}ms`, animation: "fade-in-up 0.4s ease-out both" }}
        >
          <div className="flex items-start justify-between">
            <ShimmerBlock className="h-5 w-2/3 rounded-md" />
            <ShimmerBlock className="h-5 w-20 rounded-full" />
          </div>
          <ShimmerBlock className="h-3 w-full rounded-md" />
          <ShimmerBlock className="h-2 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <ShimmerBlock className="h-12 rounded-lg" />
            <ShimmerBlock className="h-12 rounded-lg" />
            <ShimmerBlock className="h-12 rounded-lg" />
            <ShimmerBlock className="h-12 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-8 animate-fade-in-up">
      <div className="space-y-2">
        <ShimmerBlock className="h-8 w-48 rounded-lg" />
        <ShimmerBlock className="h-4 w-72 rounded-md" />
      </div>
      <ShimmerBlock className="h-9 w-28 rounded-lg" />
    </div>
  );
}
