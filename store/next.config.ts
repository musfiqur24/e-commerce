import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'admin.getprotocol.au',
      },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
    return [
      {
        source: '/api/medusa/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/:path*`, // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
