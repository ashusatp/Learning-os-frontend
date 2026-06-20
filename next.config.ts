import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    // react-pdf requires canvas which is not available in browser
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
