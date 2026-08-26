import type { Metadata } from "next";
import "./globals.css";
import { profile } from "@/content/profile";

/**
 * No resume link, download, or PDF reference anywhere in this metadata (FR-7a) —
 * the only copy of the file is the one emailed from the contact route.
 */
export const metadata: Metadata = {
  title: `${profile.name} — ${profile.title}`,
  description:
    "Software engineer in Cebu, Philippines. Building for the web since 2008 — Drupal, WordPress, and Next.js, with deep eCommerce work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
