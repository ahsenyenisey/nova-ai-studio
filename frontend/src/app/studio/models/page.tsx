"use client";

import { motion } from "framer-motion";
import { Boxes, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ModelCard } from "@/components/models/ModelCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, toErrorInfo } from "@/components/ui/ErrorState";
import { EdaSkeleton } from "@/components/ui/Skeleton";
import { fetchModels } from "@/lib/api";
import { EASE_CINEMATIC } from "@/lib/motion";
import type { ModelSummary } from "@/lib/train-types";

export default function ModelsPage() {
  const [models, setModels] = useState<ModelSummary[] | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    fetchModels()
      .then((m) => active && setModels(m))
      .catch((e: unknown) => active && setError(toErrorInfo(e)));
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_CINEMATIC }}
        className="mb-8 flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold">Modeller</h1>
        <Link href="/studio">
          <Button variant="ghost" icon={Upload} className="!px-4 !py-2 text-sm">
            Yeni veri yükle
          </Button>
        </Link>
      </motion.div>

      {error ? (
        <ErrorState message={error.message} code={error.code} />
      ) : !models ? (
        <EdaSkeleton />
      ) : models.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Henüz eğitilmiş model yok"
          description="Bir CSV yükleyip EDA'dan sonra model eğit; eğitilen modeller burada listelenir."
          action={
            <Link href="/studio">
              <Button icon={Upload}>Veri yükle</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {models.map((m) => (
            <ModelCard key={m.model_id} model={m} />
          ))}
        </div>
      )}
    </main>
  );
}
