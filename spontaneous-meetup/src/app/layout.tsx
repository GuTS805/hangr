import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import StoreInitializer from "@/components/StoreInitializer";
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
      <body className="min-h-full bg-gray-50 antialiased font-sans overscroll-none">
        <StoreInitializer />
        <Navbar />
        <main>{children}</main>
        <PingToast />
      </body>
    </html>
  );
}
