import withSerwistInit from '@serwist/next';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const offlineRevision = createHash('sha256')
  .update(readFileSync(new URL('./src/app/~offline/page.tsx', import.meta.url)))
  .digest('hex');

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: [{ url: '/~offline', revision: offlineRevision }],
  disable: process.env.NODE_ENV === 'development',
  register: true,
  reloadOnOnline: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
};

export default withSerwist(nextConfig);
