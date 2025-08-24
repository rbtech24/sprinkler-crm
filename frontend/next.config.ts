import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone mode for Docker deployment
  output: 'standalone',
  
  // Optimize for production deployment
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  
  // Image optimization for deployment
  images: {
    unoptimized: true
  },
  
  // Environment variables that will be available in the client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  
  // Redirect configuration
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  }
};

export default nextConfig;
