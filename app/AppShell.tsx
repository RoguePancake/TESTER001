"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  applyDisplayPreferences,
  loadDisplayPreferences,
} from "@/lib/display-preferences";
import { supabase } from "@/lib/supabase";
import { normalizeRole, isAdminRole, isManagerOrAbove } from "@/lib/engines/permissions";
import type { UserRole } from "@/lib/engines/permissions";

// ── Nav link definitions ───────────────────────────────────────────────────────
interface NavLink {
  href: string;
  label: string;
  icon: string;
  minRole?: UserRole;   // undefined = visible to all
}

const ALL_NAV_LINKS: NavLink[] = [
  { href: "/",          label: "Field Office", icon: "⚡" },
  { href: "/hours",     label: "Pay Clock",    icon: "⏱" },
  { href: "/notepad",   label: "Notepad",      icon: "📋" },
  { href: "/tools",     label: "Tools",        icon: "🔧" },
  { href: "/settings",  label: "Settings",     icon: "⚙️" },
];

function getNavLinks(role: UserRole | null): NavLink[] {
  if (!role) return ALL_NAV_LINKS; // demo / no-auth mode shows everything
  return ALL_NAV_LINKS.filter((link) => {
    if (!link.minRole) return true;
    if (link.minRole === "field_manager") return isManagerOrAbove(role);
    if (link.minRole === "company_owner") return isAdminRole(role);
    return true;
  });
}

// ── AppShell ──────────────────────────────────────────────────────────────────

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);

  // Apply display preferences on mount
  useEffect(() => {
    applyDisplayPreferences(loadDisplayPreferences());
  }, []);

  // Auth state listener
  const loadUserProfile = useCallback(async (authUserId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("auth_id", authUserId)
      .single();
    if (data) {
      setUserRole(normalizeRole(data.role));
      setUserName(data.full_name);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      // No Supabase = demo mode, no auth required
      setAuthChecked(true);
      return;
    }

    // Check current session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        loadUserProfile(data.session.user.id);
      } else if (pathname !== "/auth") {
        router.replace("/auth");
      }
      setAuthChecked(true);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadUserProfile(session.user.id);
      } else {
        setUserRole(null);
        setUserName("");
        if (pathname !== "/auth") router.replace("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router, loadUserProfile]);

  // Poll unread notification count (every 60s when logged in)
  useEffect(() => {
    if (!supabase || !userRole) return;
    const fetchCount = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .single();
      if (!profile) return;
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);
      setUnreadCount(count ?? 0);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [userRole]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
  };

  // Don't render shell on auth page
  if (pathname === "/auth") {
    return <body>{children}</body>;
  }

  // Wait for auth check before rendering (prevents flash)
  if (supabase && !authChecked) {
    return (
      <body className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
      </body>
    );
  }

  const navLinks = getNavLinks(userRole);

  return (
    <body className="app-shell min-h-screen flex flex-col">
      {/* ── Top Header ── */}
      <header className="app-top-nav sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14 gap-3">
          {/* Brand */}
          <Link href="/" className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-1.5">
            🏗 <span>Jobsite Ops</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1 flex-1 justify-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-white/25 font-semibold"
                    : "hover:bg-white/15"
                }`}
              >
                {link.icon} <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right side: user info + sign out */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            {userName && (
              <span className="hidden sm:block text-xs opacity-80 max-w-[120px] truncate">
                {userName}
              </span>
            )}
            {supabase && userRole && (
              <button
                onClick={handleSignOut}
                className="text-xs px-2 py-1 rounded-md hover:bg-white/15 transition-colors opacity-80 hover:opacity-100"
                title="Sign out"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 md:py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="app-bottom-nav fixed md:hidden bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md">
        <div
          className="max-w-5xl mx-auto px-2 py-2 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${navLinks.length}, 1fr)` }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                pathname === link.href
                  ? "bg-white/20 font-semibold"
                  : "hover:bg-white/10"
              }`}
            >
              <span className="text-base leading-none">{link.icon}</span>
              <span className="truncate">{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Desktop footer ── */}
      <footer className="hidden md:block border-t py-3 text-center text-xs opacity-60">
        Jobsite Ops · Field Management Operating System
        {userRole && (
          <span className="ml-2 opacity-70">· Role: {userRole}</span>
        )}
      </footer>
    </body>
  );
}
