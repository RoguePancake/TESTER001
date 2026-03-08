import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jobsite Ops HQ",
  description: "Field Operations Command Center — Artificial Turf Installation",
};

const navLinks = [
  { href: "/", label: "Dashboard", icon: "⚡" },
  { href: "/hours", label: "Hours", icon: "⏱" },
  { href: "/notepad", label: "Notepad", icon: "📋" },
  { href: "/tools", label: "Tools", icon: "🔧" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
        {/* Top nav */}
        <header className="bg-green-800 text-white shadow-md sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
            <Link href="/" className="font-bold text-lg tracking-tight">
              🏗 Jobsite Ops HQ
            </Link>
            <nav className="flex gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  {link.icon}{" "}
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 py-3 text-center text-xs text-gray-400">
          Jobsite Ops HQ · Field Operations Command Center
        </footer>
      </body>
    </html>
  );
}
