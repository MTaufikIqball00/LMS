import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['react-icons'],
};

export default nextConfig;