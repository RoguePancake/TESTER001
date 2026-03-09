/**
 * Local Auth System — manages sessions and accounts in localStorage.
 * Works without Supabase for in-house / dev-mode usage.
 */

// ── Dev account defaults ──────────────────────────────────────────────────────
export const DEV_EMAIL = "DEV@USA.COM";
export const DEV_PASSWORD = "Freedom1776";

// ── Local session ─────────────────────────────────────────────────────────────
const LS_AUTH_KEY = "jobsite_auth";

export interface LocalAuthSession {
  email: string;
  role: string;
  fullName: string;
  loggedInAt: string;
}

export function getLocalSession(): LocalAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocalSession(session: LocalAuthSession) {
  localStorage.setItem(LS_AUTH_KEY, JSON.stringify(session));
}

export function clearLocalSession() {
  localStorage.removeItem(LS_AUTH_KEY);
}

// ── Local user accounts ───────────────────────────────────────────────────────
const LS_ACCOUNTS_KEY = "jobsite_accounts";

export interface LocalAccount {
  email: string;
  password: string;
  fullName: string;
  role: string;
  createdAt: string;
  isActive: boolean;
}

export function getLocalAccounts(): LocalAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through
  }
  // Seed with dev account
  const defaults: LocalAccount[] = [
    {
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
      fullName: "Dev Admin",
      role: "CreativeEditor",
      createdAt: new Date().toISOString(),
      isActive: true,
    },
  ];
  localStorage.setItem(LS_ACCOUNTS_KEY, JSON.stringify(defaults));
  return defaults;
}

export function saveLocalAccounts(accounts: LocalAccount[]) {
  localStorage.setItem(LS_ACCOUNTS_KEY, JSON.stringify(accounts));
}
