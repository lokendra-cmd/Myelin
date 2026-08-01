import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't bundle the native/heavy mongoose driver into the server build.
  serverExternalPackages: ["mongoose"],
  images: {
    // Prefer modern formats for local covers (plan-cover.webp, etc.).
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Cache the RSC payload of dynamic pages in the client Router Cache for a
    // short window so switching between tabs (Today/Review/Analytics) and
    // navigating back is instant instead of re-hitting the server every time.
    // Mutations still call revalidatePath, which clears these caches.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
