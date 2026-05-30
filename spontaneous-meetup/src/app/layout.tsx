import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import StoreInitializer from "@/components/StoreInitializer";
import ThemeProvider from "@/components/ThemeProvider";
import PingToast from "@/components/PingToast";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#111111",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "hangr · Find people who are free right now",
  description: "Real-time spontaneous social meetup platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "hangr",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full antialiased font-sans overscroll-none" style={{ background: "var(--b-bg)", color: "var(--b-black)" }}>
        <StoreInitializer />
        <ThemeProvider />
        <Navbar />
        {/* sm:pl-60 offsets the fixed 240px left sidebar on desktop */}
        <main className="sm:pl-60">{children}</main>
        <PingToast />
      </body>
    </html>
  );
}
