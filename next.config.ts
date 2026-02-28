import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "@react-pdf/renderer"],
};

export default nextConfig;
