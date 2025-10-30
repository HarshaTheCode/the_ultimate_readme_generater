import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
