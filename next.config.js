/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for ffmpeg.wasm to work properly
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
  // Empty turbopack config to silence warning
  turbopack: {},
};

module.exports = nextConfig;
