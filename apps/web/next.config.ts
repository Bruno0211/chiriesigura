import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cs/shared"],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
