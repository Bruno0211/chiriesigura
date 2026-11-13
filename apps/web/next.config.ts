import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cs/shared"],
  serverExternalPackages: ["@electric-sql/pglite"],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
