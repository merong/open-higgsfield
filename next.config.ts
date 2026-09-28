import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "openhigsfield.oootool.com"],
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
