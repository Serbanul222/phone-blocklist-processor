import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // FIX: 'serverComponentsExternalPackages' was moved out of 'experimental'
  // and renamed to 'serverExternalPackages'.
  serverExternalPackages: ['xlsx'],

  experimental: {
    // This key is no longer needed here
  },

  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })
    return config
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  },

  // Optimize for production
  poweredByHeader: false,
  generateEtags: false,

  // Enable compression
  compress: true,

  // Custom server configuration
  serverRuntimeConfig: {
    maxDuration: 300 // 5 minutes for API routes
  }
}

export default nextConfig