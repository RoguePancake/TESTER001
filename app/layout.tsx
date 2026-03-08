import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./AppShell";

export const metadata: Metadata = {
  title: "Turf Ops Assistant",
  description: "Field Operations Command Center — Artificial Turf Installation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <AppShell>{children}</AppShell>
    </html>
  );
}
