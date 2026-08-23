/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const backend = process.env.BACKEND_URL || "https://kyro-cloud-3fp0.onrender.com";
    return [
      // Clipboard lives on the Render backend (relayed to the agent). The
      // browser's Authorization header passes through the rewrite, so the
      // backend session check still applies.
      { source: "/api/clipboard", destination: `${backend}/api/clipboard` },
      { source: "/api/clipboard/:path*", destination: `${backend}/api/clipboard/:path*` },
    ];
  },
};

export default nextConfig;
