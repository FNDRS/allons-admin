import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es">
      <body className="min-h-screen bg-background text-white antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
