import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    globalNotFound: true,
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      { source: "/register", destination: "/login", permanent: false },
      { source: "/forgot-password", destination: "/login", permanent: false },
      { source: "/am/register", destination: "/am/login", permanent: false },
      { source: "/am/forgot-password", destination: "/am/login", permanent: false },
      // የማወዳደሪያ ገጹ ተወግዷል፤ የቆዩ ሊንኮች ወደ ገበያው ይሄዳሉ።
      { source: "/compare", destination: "/accounts", permanent: true },
      { source: "/am/compare", destination: "/am/accounts", permanent: true },
    ];
  },
};

export default nextConfig;
