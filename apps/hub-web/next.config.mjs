/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@tripyou/ui'],
  // م5: تفعيل خطاف instrumentation (Next 14) — يشغل محرك الحملات الدوري مع إقلاع السيرفر
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config) => {
    // instrumentation يُبنى أيضاً لحزمة edge وسلسلة pg تحتاج fs/path/net —
    // الكود محمي بحارس NEXT_RUNTIME فلا يُنفذ في المتصفح/الإيدج، فنكتفي بإسكات الوحدات
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false, path: false, net: false, tls: false, dns: false,
      child_process: false, stream: false, crypto: false, os: false,
      buffer: false, events: false, url: false, util: false, zlib: false,
      http: false, https: false, querystring: false,
      string_decoder: false, assert: false, vm: false, tty: false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
