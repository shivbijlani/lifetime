import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_TAGLINE, SITE_TITLE } from "@/lib/branding";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_TAGLINE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
