import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: ["manage.worker-bee.app"],
  }),
  serverExternalPackages: ['playwright-core', '@sparticuz/chromium', '@react-pdf/renderer', '@react-pdf/font'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
