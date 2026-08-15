import type { Metadata } from "next";
import "./globals.css";
import { RuntimeProvider } from "@/components/providers/RuntimeProvider";
import { Notifications } from "@/components/Notifications";
import { APP_NAME, APP_TAGLINE } from "@/lib/config/branding";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: "Your PC. Anywhere.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <RuntimeProvider>
          {children}
          <Notifications />
        </RuntimeProvider>
      </body>
    </html>
  );
}
