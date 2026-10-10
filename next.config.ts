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
      {
        protocol: "https",
        hostname: "do.scotiabank.com",
        pathname: "/content/dam/**",
      },
      {
        protocol: "https",
        hostname: "www.cibao.com.do",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "cibao.com.do",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "bsc.com.do",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.bsc.com.do",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "popularenlinea.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.popularenlinea.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
