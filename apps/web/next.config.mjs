/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@factward/core"],
  // Externalize packages that must run as native Node.js modules (not webpack-bundled)
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "jsdom", "@mozilla/readability"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdfjs-dist tries to import 'canvas' for node-canvas rendering.
      // Stub it to false so the build doesn't crash in serverless environments.
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
        "@napi-rs/canvas": false,
      };
    }
    return config;
  },
};
export default nextConfig;
