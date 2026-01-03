import type { Metadata, Viewport } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import CapacitorManager from "@/components/CapacitorManager";
import NotificationManager from "@/components/NotificationManager";
import PageAnimatePresence from "@/components/PageAnimatePresence";
import { TrackingProvider } from "@/hooks/useTracking";
import { AnimatePresence } from "framer-motion";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TV & Cinema",
  description: "Track your favorite movies and series",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import SearchOverlay from "@/components/SearchOverlay";
import Onboarding from "@/components/Onboarding";
import ActorOverlay from "@/components/ActorOverlay";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Suspense fallback={<div className="bg-black min-h-screen" />}>
          <TrackingProvider>
            <CapacitorManager />
            <NotificationManager />
            <AnimatePresence mode="wait">
              <PageAnimatePresence>
                {children}
              </PageAnimatePresence>
            </AnimatePresence>
            <Suspense fallback={null}>
              <BottomNav />
            </Suspense>
            <Suspense fallback={null}>
              <Onboarding />
            </Suspense>
            <Suspense fallback={null}>
              <SearchOverlay />
            </Suspense>
            <Suspense fallback={null}>
              <ActorOverlay />
            </Suspense>
          </TrackingProvider>
        </Suspense>
      </body>
    </html>
  );
}
