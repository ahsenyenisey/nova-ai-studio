"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Dropzone } from "@/components/studio/Dropzone";
import { ApiError, uploadCsv } from "@/lib/api";
import { EASE_CINEMATIC } from "@/lib/motion";

export default function StudioPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const res = await uploadCsv(file);
        // Başarılı → otomatik EDA paneline geç (CLAUDE.md).
        router.push(`/studio/eda/${res.dataset_id}`);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Beklenmeyen bir hata oluştu.";
        setError(message);
        setUploading(false);
      }
    },
    [router],
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_CINEMATIC }}
        className="mb-10 text-center"
      >
        <h1 className="text-4xl font-bold sm:text-5xl">Veri Yükle</h1>
        <p className="mt-3 text-text-muted">
          CSV&apos;ni bırak, NOVA otomatik keşifsel analizi başlatsın.
        </p>
      </motion.div>

      <Dropzone onFile={handleFile} disabled={uploading} />

      <AnimatePresence mode="wait">
        {uploading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-8 flex items-center justify-center gap-3 font-metric text-sm text-accent-cyan"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            veri taranıyor…
          </motion.div>
        ) : null}

        {error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
