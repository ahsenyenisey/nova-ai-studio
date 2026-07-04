import { Hero } from "@/components/landing/Hero";
import { NebulaBackground } from "@/components/landing/NebulaBackground";

export default function LandingPage() {
  return (
    <main className="relative">
      <NebulaBackground />
      <Hero />
    </main>
  );
}
