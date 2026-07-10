import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Ortak boş durum: ikon + başlık + açıklama + opsiyonel aksiyon. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-glow bg-surface-glass px-6 py-16 text-center">
      <span className="rounded-2xl border border-border-glow bg-bg-nebula p-4">
        <Icon className="h-7 w-7 text-primary" aria-hidden />
      </span>
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-text-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
