import type { NextConfig } from "next";

/**
 * رؤوس الأمان تُضبط هنا لا في netlify.toml، لأن صفحات Next
 * تُقدَّم من دالة الخادم ولا تمرّ على قواعد رؤوس Netlify.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // نظام داخلي للمكتب — لا يُفهرس في محركات البحث إطلاقًا
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
