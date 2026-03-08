import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AppShell from "./AppShell";

export const metadata: Metadata = {
  title: "Turf Ops Assistant",
  description: "Field Operations Command Center — Artificial Turf Installation",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
