import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: any = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.10.248', '192.168.10.248:3000', 'localhost', 'localhost:3000'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  turbopack: {},
};

export default withPWA(nextConfig);

