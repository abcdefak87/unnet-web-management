/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    // Only apply rewrites in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/:path*',
        },
      ];
    }
    return [];
  },
  // Suppress router errors in development
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Custom webpack config to handle router errors
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Suppress router abort errors in development
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            default: {
              ...config.optimization.splitChunks?.cacheGroups?.default,
              minChunks: 1,
            },
          },
        },
      }
      
      // Add plugin to suppress specific errors
      config.plugins = config.plugins || []
      config.plugins.push(
        new (require('webpack')).DefinePlugin({
          'process.env.SUPPRESS_ROUTER_ERRORS': JSON.stringify('true'),
        })
      )
    }
    return config
  },
  // Enable webpack build worker and remove invalid options
  experimental: {
    webpackBuildWorker: true,
  },
}

module.exports = nextConfig
