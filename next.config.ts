import type { NextConfig } from "next";

const forCpanel = process.env.CPANEL_BUILD === "1";

const nextConfig: NextConfig = {
  // Self-contained server (.next/standalone/server.js) — no `npm install` needed on the host.
  output: "standalone",
  // Load the MySQL driver from node_modules at runtime (it's traced into the standalone build).
  serverExternalPackages: ["mysql2"],
  // Never bundle private or source files into the server build (the tracer can over-match on
  // folder names used in fs code — e.g. the old-system exports in /legacy hold personal data).
  outputFileTracingExcludes: {
    "**/*": ["./legacy/**/*", "./src/**/*", "./data/**/*", "./deploy/**/*", "./.env*"],
  },
  experimental: {
    // Admin uploads: images (up to 3 MB) and old-system .sql exports
    serverActions: { bodySizeLimit: "8mb" },
  },
  images: {
    // The image optimiser needs a native library built for the server's OS. A cPanel package is
    // built on another machine, so serve images as-is there (they're mostly SVG anyway).
    unoptimized: forCpanel,
  },
};

export default nextConfig;
