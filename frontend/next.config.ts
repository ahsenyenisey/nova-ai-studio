import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desktop'taki başka bir lockfile nedeniyle Next'in workspace kökünü yanlış
  // çıkarmasını engelle; kökü bu frontend dizinine sabitle.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
