import type { NextConfig } from "next";

// Baseline HTTP hardening for actuallydeals.com (clickjacking, MIME sniffing,
// referrer leakage, unused browser APIs). No CSP: Amazon/CDN images and Next
// inline scripts must keep loading. Outbound Get Deal links are unchanged.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/", headers: securityHeaders },
      { source: "/:path*", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
