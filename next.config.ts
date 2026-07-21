import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSerwist } from "@serwist/turbopack";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // TypeScript 7 has no JS compiler API; use the local `tsc` CLI instead.
  experimental: {
    useTypeScriptCli: true,
  },
  // Lightweight security headers (CSP intentionally omitted to avoid breaking
  // images and the game WebSocket, same as the previous app).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        // Always re-fetch the legacy /sw.js kill-switch so old Nuxt PWA
        // workers get unregistered promptly.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Never HTTP-cache the active service worker or its precache manifest,
        // so a redeploy is picked up immediately instead of leaving the PWA
        // frozen on a stale shell that references now-404 JS chunks.
        source: "/serwist/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));
