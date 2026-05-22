import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto (hay otro package-lock.json en el home que confunde a Turbopack).
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
