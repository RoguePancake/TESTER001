import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent ESLint warnings from failing Vercel production builds.
  // Run `npm run lint` locally to catch issues; CI can enforce separately.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
