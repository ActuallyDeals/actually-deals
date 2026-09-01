import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SOCIAL, SOCIAL_SAME_AS } from "@/lib/social";
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
  metadataBase: new URL("https://actuallydeals.com"),
  title: {
    default: "Actually Deals",
    template: "%s · Actually Deals",
  },
  description:
    "Human-verified shopping deals from Amazon, Walmart, Target, Home Depot, and Best Buy. Community votes keep the feed honest.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon",
  },
  twitter: {
    site: SOCIAL.x.handle,
  },
  other: {
    "impact-site-verification": "395465db-ea87-47f4-b448-96d4da2b11cf",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Actually Deals",
  url: "https://actuallydeals.com",
  sameAs: [...SOCIAL_SAME_AS],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-100 text-slate-900">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
