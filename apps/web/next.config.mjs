/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@proofmode/core"],
  typescript: {
    // Phase M stabilization: ignore TS errors at build time.
    // Remove once all type errors are resolved.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
