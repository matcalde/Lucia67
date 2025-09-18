import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignore ESLint errors during production builds to avoid blocking deploys
    ignoreDuringBuilds: true,
  },
  images: {
    // Allow specific external hosts for images
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      // Supabase Storage domain (allow serving images from your bucket)
      { protocol: "https", hostname: "movybzzxkfgqyxuhomhd.supabase.co" },
    ],
  },
};

export default nextConfig;
