import type { Metadata } from "next";
import { product } from "@/config/product";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AuthProvider } from "@/lib/client/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: product.name, template: `%s · ${product.name}` },
  description: product.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
