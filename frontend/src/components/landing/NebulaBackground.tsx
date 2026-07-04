/**
 * Arka plan atmosferi — yavaş sürüklenen, düşük opaklıklı nebula orb'ları.
 * Yalnızca CSS transform/opacity (nova-drift keyframe) kullanır; layout tetiklemez.
 * `prefers-reduced-motion` globals.css'te otomatik durdurulur.
 */
export function NebulaBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg-void"
    >
      {/* Elektrik moru orb — sol üst */}
      <div
        className="absolute -left-40 -top-40 h-[38rem] w-[38rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(108,123,255,0.28), transparent 70%)",
          animation: "nova-drift 24s ease-in-out infinite",
        }}
      />
      {/* Cyan orb — sağ alt */}
      <div
        className="absolute -bottom-52 right-[-10rem] h-[42rem] w-[42rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(78,225,208,0.16), transparent 70%)",
          animation: "nova-drift 30s ease-in-out infinite reverse",
        }}
      />
      {/* Derin mor orb — merkez */}
      <div
        className="absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(120,90,255,0.14), transparent 70%)",
          animation: "nova-drift 36s ease-in-out infinite",
        }}
      />
      {/* İnce yıldız tozu dokusu için hafif vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 55%, rgba(5,6,15,0.9) 100%)",
        }}
      />
    </div>
  );
}
