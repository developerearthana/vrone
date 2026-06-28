import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
      allowedOrigins: ['earthana-ers.onrender.com', '*.onrender.com', 'localhost:3000', '*.run.app', 'dev.vrone.pro', 'erp.vrone.pro', 'vrone.pro']
    },
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons'],
  },
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ['mongoose'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        source: '/api/health',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=30, stale-while-revalidate=60' }],
      },
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
