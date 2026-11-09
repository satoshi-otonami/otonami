/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // next/og のカード生成で使う Noto Sans JP の .woff を serverless 関数に確実に同梱する。
  // lib/sns-intro-card.jsx は join(process.cwd(), '.../files') + readFile で読むため、
  // ファイルトレースがディレクトリ全体（1,125ファイル・46MB）を拾っていた（14 でも同じ）。
  // 実際に読む4ファイル以外を除外する（除外は同梱より優先されるので、4ファイルは否定で外す）。
  outputFileTracingExcludes: {
    '/api/admin/sns-intro': ['./node_modules/@fontsource/noto-sans-jp/files/!(noto-sans-jp-{latin,japanese}-{400,500}-normal.woff)'],
  },
  outputFileTracingIncludes: {
    '/api/admin/sns-intro': ['./node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-{latin,japanese}-{400,500}-normal.woff'],
  },
};
module.exports = nextConfig;
