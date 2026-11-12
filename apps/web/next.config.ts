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
  async rewrites() {
    const rawTarget =
      process.env.API_BACKEND_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "https://ledgerly-erp.onrender.com";
    const target = rawTarget.replace(/\/api\/v1\/?$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${target}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
