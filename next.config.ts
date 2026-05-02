import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // allowedDevOrigins hanya untuk dev lokal, tidak berpengaruh di Vercel
  allowedDevOrigins: ['192.168.1.4', 'localhost:3000'],
  // Pastikan trailing slash konsisten
  trailingSlash: false,
};

export default nextConfig;
