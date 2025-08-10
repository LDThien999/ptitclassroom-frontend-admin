import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  //domain for static images
  images: {
    domains: ['i.pinimg.com'],
  },
};

export default nextConfig;
