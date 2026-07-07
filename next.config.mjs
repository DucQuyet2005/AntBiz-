/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─── VPS Production Hardening ─────────────────────────────────────────────

  // Tắt X-Powered-By header để tránh lộ stack
  poweredByHeader: false,

  // Compress responses (gzip) — quan trọng trên VPS không có CDN
  compress: true,

  // Tránh OOM (Killed) khi build trên VPS RAM thấp bằng cách bỏ qua kiểm tra TypeScript và ESLint lúc build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Turbopack config (Next.js 16+ dùng Turbopack mặc định)
  // Để trống = dùng defaults, silence warning về webpack vs turbopack
  turbopack: {},

  // Cho phép ảnh từ bất kỳ domain nào (needed for external image URLs)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },

  // Security & cache headers cho mọi response
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // Cache dài hạn cho static assets (font, ảnh, file build)
      {
        source: '/(.*)\\.(woff2?|ttf|otf|eot|ico|png|jpg|jpeg|webp|svg|gif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
