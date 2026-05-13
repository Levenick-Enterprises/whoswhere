import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { ThemeManager } from "@/components/ThemeManager";
import { THEME_STORAGE_KEY } from "@/lib/prefsKeys";

import "./globals.css";

// Runs synchronously before paint so the `.dark` class is on <html> on the
// very first frame — prevents a flash of the wrong theme. Reads the same
// storage key used by usePrefs so the two can't drift.
const themeBootstrapScript = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || ((stored !== 'light') && systemDark);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Who's Where?",
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeManager />
        <AppHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pb-6">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
