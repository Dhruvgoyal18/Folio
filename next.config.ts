import type { NextConfig } from "next";

const config: NextConfig = {
  env: { NEXT_PUBLIC_BUILD: new Date().toISOString().slice(0, 16).replace("T", " ") },
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["@react-three/drei", "motion"] },
};

export default config;
