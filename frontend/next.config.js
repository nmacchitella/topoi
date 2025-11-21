/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  webpack: (config) => {
    // Fix for leaflet
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
}

module.exports = nextConfig
