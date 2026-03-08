"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  applyDisplayPreferences,
  loadDisplayPreferences,
} from "@/lib/display-preferences";

const navLinks = [
  { href: "/", label: "Dashboard", icon: "⚡" },
  { href: "/hours", label: "Hours", icon: "⏱" },
  { href: "/notepad", label: "Notepad", icon: "📋" },
  { href: "/tools", label: "Tools", icon: "🔧" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

function isActivePath(currentPath: string, href: string) {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    applyDisplayPreferences(loadDisplayPreferences());
  }, []);

  return (
    <div className="app-shell min-h-screen flex flex-col">
      <header className="app-top-nav sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14 gap-3">
          <Link href="/" className="font-bold text-base sm:text-lg tracking-tight">
            🏗 Turf Ops Assistant
          </Link>
          <nav className="hidden md:flex gap-1" aria-label="Primary navigation">
            {navLinks.map((link) => {
              const active = isActivePath(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/25 text-white"
                      : "hover:bg-white/15 text-white/90"
                  }`}
                >
                  {link.icon} <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 md:py-6 pb-24 md:pb-6">
        {children}
      </main>

      <nav
        className="app-bottom-nav fixed md:hidden bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md"
        aria-label="Mobile navigation"
      >
        <div className="max-w-5xl mx-auto px-2 py-2 grid grid-cols-5 gap-1">
          {navLinks.map((link) => {
            const active = isActivePath(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                  active
                    ? "bg-white/20 text-white"
                    : "hover:bg-white/10 text-white/85"
                }`}
              >
                <span className="text-base leading-none">{link.icon}</span>
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="hidden md:block border-t py-3 text-center text-xs opacity-70">
        Turf Ops Assistant · Artificial Turf Installer Personal Assistant
      </footer>
    </div>
  );
}
