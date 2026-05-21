import type { NextConfig } from "next";

// Build the allowed origins list from env so it works in every environment
// without hardcoding. Set NEXT_PUBLIC_APP_URL to the production domain on Vercel.
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const allowedOrigins: string[] = [];
try {
  allowedOrigins.push(new URL(appUrl).host);
} catch {
  allowedOrigins.push("localhost:3000");
}
// Keep localhost accessible in development
if (process.env.NODE_ENV !== "production") {
  if (!allowedOrigins.includes("localhost:3000")) allowedOrigins.push("localhost:3000");
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
