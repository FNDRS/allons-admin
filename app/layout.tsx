import type { Metadata } from "next";
import "./globals.css";
import { Silkscreen, Urbanist } from "next/font/google";

const silkscreen = Silkscreen({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-silkscreen",
  weight: ["400", "700"],
});

const urbanist = Urbanist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-urbanist",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Allons Admin",
  description: "Internal control panel for the Allons platform.",
  icons: {
    icon: "/apple-touch-icon.png",
    apple: "/apple-touch-icon.png",
    shortcut: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${silkscreen.variable} ${urbanist.variable}`}>
      <body className="min-h-screen bg-background text-white antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
