import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { BottomNav } from "@/components/BottomNav";

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
  title: "whoswhere",
  description: "A digital magnet board for tracking who's at which jobsite.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pb-6">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
