import { EdaDashboard } from "@/components/eda/EdaDashboard";

// Next 16 App Router: params bir Promise; await ederek datasetId'yi çözüyoruz.
export default async function EdaPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return (
    <main className="min-h-screen">
      <EdaDashboard datasetId={datasetId} />
    </main>
  );
}
