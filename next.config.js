/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // next/og のカード生成で使う Noto Sans JP の .woff を serverless 関数に確実に同梱する。
  outputFileTracingIncludes: {
    '/api/admin/sns-intro': ['./node_modules/@fontsource/noto-sans-jp/files/*.woff'],
  },
};
module.exports = nextConfig;
