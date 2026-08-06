/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH;

const nextConfig = {
  ...(basePath ? { basePath, trailingSlash: true } : {}),
  output: "standalone",
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // data-loader 用到 Node fs；若被误编进 client/edge，给空 fallback 避免 resolve 炸掉
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        "fs/promises": false,
      };
    }
    return config;
  },
};
export default nextConfig;
