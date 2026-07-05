"use client";

import { motion } from "framer-motion";
import { UploadCloud, FileWarning } from "lucide-react";
import { useCallback, useRef, useState } from "react";

const MAX_BYTES = 20 * 1024 * 1024;

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

/** Sürükle-bırak CSV alanı; dragover'da kenar parlar (CLAUDE.md). */
export function Dropzone({ onFile, disabled = false }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndEmit = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const name = file.name.toLowerCase();
      if (!name.endsWith(".csv")) {
        setLocalError("Yalnızca .csv dosyaları desteklenir.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setLocalError("Dosya 20MB sınırını aşıyor.");
        return;
      }
      setLocalError(null);
      onFile(file);
    },
    [onFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      validateAndEmit(e.dataTransfer.files?.[0]);
    },
    [disabled, validateAndEmit],
  );

  return (
    <div className="w-full">
      <motion.button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        animate={{
          scale: dragging ? 1.01 : 1,
          borderColor: dragging
            ? "rgba(108,123,255,0.7)"
            : "rgba(120,140,255,0.15)",
        }}
        transition={{ duration: 0.25 }}
        className={
          "flex w-full flex-col items-center justify-center gap-4 rounded-3xl " +
          "border-2 border-dashed bg-surface-glass px-8 py-20 text-center " +
          "backdrop-blur-xl transition-shadow cursor-pointer " +
          "disabled:cursor-not-allowed disabled:opacity-60 " +
          (dragging
            ? "shadow-[0_0_48px_-8px_rgba(108,123,255,0.6)]"
            : "shadow-none")
        }
      >
        <motion.span
          animate={{ y: dragging ? -4 : 0 }}
          className="rounded-2xl border border-border-glow bg-bg-nebula p-4"
        >
          <UploadCloud
            className="h-8 w-8 text-primary"
            aria-hidden
          />
        </motion.span>
        <span className="text-lg font-medium text-text-primary">
          CSV dosyanı buraya sürükle
        </span>
        <span className="text-sm text-text-muted">
          ya da tıklayıp seç · en fazla 20MB
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => validateAndEmit(e.target.files?.[0])}
        />
      </motion.button>

      {localError ? (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-danger">
          <FileWarning className="h-4 w-4" aria-hidden />
          {localError}
        </p>
      ) : null}
    </div>
  );
}
