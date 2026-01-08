import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_TAGLINE, SITE_TITLE } from "@/lib/branding";
import { PwaRegister } from "./pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_TAGLINE,
  manifest: "/manifest.webmanifest",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    title: SITE_TITLE,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
