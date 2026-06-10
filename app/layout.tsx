import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "claurix – AI Quote Comparison Reports for Insurance Brokers",
  description:
    "AI-powered QCR platform built to streamline broker workflows, compare insurer quotes, and deliver consistent quote comparison reports every time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
          <ToastProvider />
        </AuthProvider>
      </body>
    </html>
  );
}
