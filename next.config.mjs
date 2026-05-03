/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '50mb' },
  },
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
};

export default nextConfig;
