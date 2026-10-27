import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@erp/ui", "@erp/types"],
  poweredByHeader: false,
  turbopack: { root: path.resolve(process.cwd(), "../..") },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    workerThreads: true,
  },
};

export default nextConfig;
