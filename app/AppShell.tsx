"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  applyDisplayPreferences,
  loadDisplayPreferences,
} from "@/lib/display-preferences";

const navLinks = [
  { href: "/", label: "Field Office", icon: "⚡" },
  { href: "/hours", label: "Pay Clock", icon: "⏱" },
  { href: "/notepad", label: "Notepad", icon: "📋" },
  { href: "/tools", label: "Tools", icon: "🔧" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyDisplayPreferences(loadDisplayPreferences());
  }, []);

  return (
    <body className="app-shell min-h-screen flex flex-col">
      <header className="app-top-nav sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14 gap-3">
          <Link href="/" className="font-bold text-base sm:text-lg tracking-tight">
            🏗 Turf Ops Assistant
          </Link>
          <nav className="hidden md:flex gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-white/15 transition-colors"
              >
                {link.icon} <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 md:py-6 pb-24 md:pb-6">
        {children}
      </main>

      <nav className="app-bottom-nav fixed md:hidden bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-2 py-2 grid grid-cols-5 gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              <span className="text-base leading-none">{link.icon}</span>
              <span className="truncate">{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <footer className="hidden md:block border-t py-3 text-center text-xs opacity-70">
        Turf Ops Assistant · Artificial Turf Installer Personal Assistant
      </footer>
    </body>
  );
}
