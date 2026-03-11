/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@factward/core"],
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
  serverExternalPackages: ["jsdom", "@mozilla/readability"],
};
export default nextConfig;