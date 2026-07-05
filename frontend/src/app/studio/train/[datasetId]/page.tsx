import { TrainDashboard } from "@/components/train/TrainDashboard";

// Next 16 App Router: params bir Promise; await ederek datasetId'yi çözüyoruz.
export default async function TrainPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return (
    <main className="min-h-screen">
      <TrainDashboard datasetId={datasetId} />
    </main>
  );
}
