import type { Metadata } from "next";
import "./globals.css";
import { Silkscreen } from "next/font/google";

const silkscreen = Silkscreen({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-silkscreen",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Allons Admin",
  description: "Internal control panel for the Allons platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={silkscreen.variable}>
      <body className="min-h-screen bg-background text-white antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
