import { PredictDashboard } from "@/components/predict/PredictDashboard";

// Next 16 App Router: params bir Promise; await ederek modelId'yi çözüyoruz.
export default async function PredictPage({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const { modelId } = await params;
  return (
    <main className="min-h-screen">
      <PredictDashboard modelId={modelId} />
    </main>
  );
}
