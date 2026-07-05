"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

interface ColumnSelectorProps {
  allNumeric: string[];
  selected: string[];
  loading: boolean;
  onApply: (columns: string[]) => void;
}

/** Grafiklerde gösterilecek sayısal sütunları düzenleyen popover. */
export function ColumnSelector({
  allNumeric,
  selected,
  loading,
  onApply,
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(selected);
  const ref = useRef<HTMLDivElement>(null);

  // Popover'ı açarken taslağı güncel seçimle eşitle (effect-içi senkron
  // setState yerine olay anında — cascading render yok).
  const openPopover = () => {
    setDraft(selected);
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = (col: string) =>
    setDraft((d) =>
      d.includes(col) ? d.filter((c) => c !== col) : [...d, col],
    );

  const apply = () => {
    onApply(draft);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        icon={loading ? undefined : SlidersHorizontal}
        onClick={openPopover}
        className="!px-4 !py-2 text-sm"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : null}
        Sütunları düzenle
      </Button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-border-glow bg-bg-nebula/95 p-3 shadow-2xl backdrop-blur-xl"
          >
            <p className="mb-2 px-1 text-xs text-text-muted">
              Grafiklerde gösterilecek sayısal sütunlar
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {allNumeric.map((col) => {
                const active = draft.includes(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => toggle(col)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5"
                  >
                    <span
                      className={
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
                        (active
                          ? "border-primary bg-primary text-white"
                          : "border-border-glow")
                      }
                    >
                      {active ? <Check className="h-3 w-3" aria-hidden /> : null}
                    </span>
                    <span className="truncate text-text-primary">{col}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                onClick={apply}
                disabled={draft.length === 0}
                className="!px-4 !py-2 text-sm"
              >
                Uygula
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
