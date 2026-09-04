import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qik.do",
        pathname: "/content/dam/**",
      },
      {
        protocol: "https",
        hostname: "cdn.lafise.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.lafise.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static.bhd.com.do",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "backend.bhd.com.do",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
