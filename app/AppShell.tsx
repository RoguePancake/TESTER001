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
import { getLocalSession, clearLocalSession } from "@/lib/local-auth";
import type { LocalAuthSession } from "@/lib/local-auth";

// ── Nav link definitions ───────────────────────────────────────────────────────
interface NavLink {
  href: string;
  label: string;
  icon: string;
  minRole?: UserRole;   // undefined = visible to all
}

const ALL_NAV_LINKS: NavLink[] = [
  { href: "/",          label: "IO Home", icon: "⚡" },
  { href: "/hours",     label: "Pay Clock",    icon: "⏱" },
  { href: "/notepad",   label: "Notepad",      icon: "📋" },
  { href: "/tools",     label: "Tools",        icon: "🔧" },
  { href: "/employees", label: "Employees",    icon: "👥", minRole: "field_manager" },
  { href: "/reports",   label: "Reports",      icon: "📊", minRole: "field_manager" },
  { href: "/notifications", label: "Alerts",    icon: "🔔" },
  { href: "/settings",  label: "Settings",     icon: "⚙️" },
  { href: "/system",    label: "System Info",  icon: "ℹ️" },
  { href: "/admin",     label: "Admin",        icon: "🛠", minRole: "company_owner" },
  { href: "/dev-tools", label: "Dev Tools",    icon: "🔬", minRole: "CreativeEditor" },
];

function getNavLinks(role: UserRole | null): NavLink[] {
  if (!role) return ALL_NAV_LINKS.filter((l) => !l.minRole);
  return ALL_NAV_LINKS.filter((link) => {
    if (!link.minRole) return true;
    if (link.minRole === "CreativeEditor") return role === "CreativeEditor";
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
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);
  const [localSession, setLocalSessionState] = useState<LocalAuthSession | null>(null);

  const isLocal = !supabase;

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
    if (isLocal) {
      // Local auth mode
      const session = getLocalSession();
      if (session) {
        setLocalSessionState(session);
        setUserRole(normalizeRole(session.role));
        setUserName(session.fullName);
        setAuthChecked(true);
      } else if (pathname !== "/auth") {
        router.replace("/auth");
      } else {
        setAuthChecked(true);
      }
      return;
    }

    // Supabase auth mode
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        loadUserProfile(data.session.user.id);
      } else if (pathname !== "/auth") {
        router.replace("/auth");
      }
      setAuthChecked(true);
    });

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
  }, [pathname, router, loadUserProfile, isLocal]);

  // Poll unread notification count (every 60s when logged in, Supabase only)
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

  // Poll pending approvals count (managers only, every 60s)
  useEffect(() => {
    if (!userRole || !isManagerOrAbove(userRole)) return;
    const fetchPending = async () => {
      if (supabase) {
        const { count } = await supabase
          .from("time_entries")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .not("clock_out", "is", null);
        setPendingApprovalsCount(count ?? 0);
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 60_000);
    return () => clearInterval(interval);
  }, [userRole]);

  const handleSignOut = async () => {
    if (isLocal) {
      clearLocalSession();
      setLocalSessionState(null);
      setUserRole(null);
      setUserName("");
      router.push("/auth");
    } else {
      await supabase.auth.signOut();
      router.push("/auth");
    }
  };

  // Don't render shell on auth page
  if (pathname === "/auth") {
    return <body>{children}</body>;
  }

  // Wait for auth check before rendering
  if (!authChecked) {
    return (
      <body className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm animate-pulse">Loading...</p>
      </body>
    );
  }

  // If not logged in (local mode) and not on auth page, don't render
  if (isLocal && !localSession && pathname !== "/auth") {
    return (
      <body className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm animate-pulse">Redirecting to login...</p>
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
          <Link href="/" className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">IO</span>
            <span className="hidden sm:block">Install Ops</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1 flex-1 justify-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-white/25 font-semibold"
                    : "hover:bg-white/15"
                }`}
              >
                {link.icon} <span>{link.label}</span>
                {link.href === "/hours" && pendingApprovalsCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-yellow-400 text-yellow-900 rounded-full">
                    {pendingApprovalsCount > 9 ? "9+" : pendingApprovalsCount}
                  </span>
                )}
                {link.href === "/notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Right side: user info + sign out */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Link href="/notifications" className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors" title="Unread notifications">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Link>
            )}
            {userName && (
              <span className="hidden sm:block text-xs opacity-80 max-w-[120px] truncate">
                {userName}
              </span>
            )}
            {userRole && (
              <span className="hidden sm:block text-xs opacity-60">
                ({userRole})
              </span>
            )}
            {(supabase || localSession) && userRole && (
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
          style={{ gridTemplateColumns: `repeat(${Math.min(navLinks.length, 6)}, 1fr)` }}
        >
          {navLinks.slice(0, 6).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                pathname === link.href
                  ? "bg-white/20 font-semibold"
                  : "hover:bg-white/10"
              }`}
            >
              <span className="text-base leading-none">{link.icon}</span>
              <span className="truncate">{link.label}</span>
              {link.href === "/hours" && pendingApprovalsCount > 0 && (
                <span className="absolute top-0.5 right-1 inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 text-[9px] font-bold bg-yellow-400 text-yellow-900 rounded-full">
                  {pendingApprovalsCount > 9 ? "9+" : pendingApprovalsCount}
                </span>
              )}
              {link.href === "/notifications" && unreadCount > 0 && (
                <span className="absolute top-0.5 right-1 inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 text-[9px] font-bold bg-red-500 text-white rounded-full">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Desktop footer ── */}
      <footer className="hidden md:block border-t py-3 text-center text-xs opacity-60">
        Jobsite Ops HQ · Field Management Operating System
        {userRole && (
          <span className="ml-2 opacity-70">· Role: {userRole}</span>
        )}
      </footer>
    </body>
  );
}
