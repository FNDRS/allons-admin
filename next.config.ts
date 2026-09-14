import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone es requerido para Docker/App Runner (copia mínima con server.js)
  output: "standalone",
  reactStrictMode: true,
  typedRoutes: true,
  compress: true,
  // Trim JS for lucide/recharts - admin ships both, saves ~100kb parsed.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
    // Client router cache: keep previous page in memory 5m, avoid refetch on back.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
