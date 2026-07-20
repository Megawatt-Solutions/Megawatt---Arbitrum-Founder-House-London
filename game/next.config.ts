import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // xrpl.js pulls in ws; keep it server-side only.
  serverExternalPackages: ["xrpl"],
};

export default nextConfig;
