import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import { Toaster } from "@/components/Toaster";

export const metadata: Metadata = {
  title: "PMR Industries — Inventory, Expenses & Staff",
  description: "Manage inventory, expenses, and staff attendance for PMR Industries",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icons/icon-192.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PMR",
    startupImage: ["/icons/icon-512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#1976D2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <RegisterServiceWorker />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
