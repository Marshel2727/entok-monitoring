import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_API_URL || "http://localhost:5000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: "/static/:path*",
        destination: `${backendOrigin}/static/:path*`,
      },
    ];
  },
};

export default nextConfig;
