/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'i.redd.it',
      'preview.redd.it',
      'external-preview.redd.it',
      'i.imgur.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.reddit.com',
      },
      {
        protocol: 'https',
        hostname: '**.redditmedia.com',
      },
    ],
  },
};

module.exports = nextConfig;
