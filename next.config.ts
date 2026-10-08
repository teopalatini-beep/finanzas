import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Subida de resúmenes (PDF/foto). El límite por defecto es 1 MB.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
