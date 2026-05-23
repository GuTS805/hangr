import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import StoreInitializer from "@/components/StoreInitializer";
import PingToast from "@/components/PingToast";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "hangr · Find people who are free right now",
  description: "Real-time spontaneous social meetup platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 antialiased font-sans">
        <StoreInitializer />
        <Navbar />
        <main>{children}</main>
        <PingToast />
      </body>
    </html>
  );
}
