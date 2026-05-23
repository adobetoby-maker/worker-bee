import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["manage.worker-bee.app"],
  serverExternalPackages: ['playwright-core', '@sparticuz/chromium'],
};

export default nextConfig;
