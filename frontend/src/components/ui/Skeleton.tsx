/** "Veri taranıyor" hissi veren skeleton + pulse (CLAUDE.md yükleme kuralı). */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "animate-pulse rounded-xl bg-surface-glass " +
        "border border-border-glow " +
        className
      }
    />
  );
}

/** EDA sayfası için tam-genişlik skeleton yerleşimi. */
export function EdaSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
