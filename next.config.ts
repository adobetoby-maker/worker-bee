import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the Cloudflare tunnel hostname to serve HMR WebSocket connections
  allowedDevOrigins: ["manage.worker-bee.app"],
};

export default nextConfig;
