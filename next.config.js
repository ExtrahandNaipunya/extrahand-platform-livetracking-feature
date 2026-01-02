/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // swcMinify is now default in Next.js 16, no need to specify
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
  },
  // Turbopack is now default in Next.js 16
  // Configure Turbopack root to current directory
  turbopack: {
    root: __dirname,
  },
}

module.exports = nextConfig
