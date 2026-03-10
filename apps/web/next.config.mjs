/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@proofmode/core"],
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
