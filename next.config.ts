import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  output: 'standalone',
};

export default nextConfig;
