import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["ihrishi-opssemble.w.tunnels.lab.aws.dev"],
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
