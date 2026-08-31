import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Providers } from "@/components/providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://actuallydeals.com"),
  title: {
    default: "Actually Deals — Today's hottest freebies and price drops",
    template: "%s · Actually Deals",
  },
  description:
    "Today's best prices, coupon codes, and price drops. Click through to the store and confirm the total at checkout.",
  openGraph: {
    title: "Actually Deals",
    description: "Today's hottest freebies and price drops.",
    type: "website",
  },
  other: {
    "impact-site-verification": "b65b4c60-07b9-466f-b7bb-5b434e030171",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} light h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-white text-slate-900">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
