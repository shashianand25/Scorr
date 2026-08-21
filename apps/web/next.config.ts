import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow hot-reloading from your network IP
  allowedDevOrigins: ['10.195.69.202'],
  async redirects() {
    return [
      {
        source: '/how-it-works',
        destination: '/#how-it-works',
        permanent: true,
      },
      {
        source: '/features',
        destination: '/#how-it-works',
        permanent: true,
      },
      {
        source: '/subjects',
        destination: '/#subjects',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
