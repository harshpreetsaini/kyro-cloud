import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/config/branding";

// Self-hosted via next/font: preloaded, swap-strategy, zero render-blocking
// Google Fonts CSS round-trip (major mobile first-paint win).
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: "Your PC. Anywhere.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f102c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${plexMono.variable}`}>
      <head>
        {/* Steam CDN hosts most game artwork — warm the connection early. */}
        <link rel="preconnect" href="https://cdn.akamai.steamstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.akamai.steamstatic.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
