/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@proofmode/core"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse bundles pdfjs-dist which tries to import 'canvas'.
      // Stub it to false so the build doesn't crash with DOMMatrix / canvas errors.
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    return config;
  },
};

export default nextConfig;
