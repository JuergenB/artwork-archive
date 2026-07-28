import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // The Excel export opens Artwork Archive's own .xlsx templates at runtime.
  // Next's tracer cannot see a path built at runtime, so include them explicitly
  // or the export route 500s on Vercel with ENOENT.
  outputFileTracingIncludes: {
    "/api/export/generate": ["./lib/export/templates/**"],
  },
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
