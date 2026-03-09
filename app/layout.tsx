import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./AppShell";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Install Operations",
  description: "IO — Install Operations Field Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <AppShell>
        {children}
        <SpeedInsights />
      </AppShell>
    </html>
  );
}
