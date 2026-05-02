import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.1.4', 'localhost:3000'],
};

export default nextConfig;
