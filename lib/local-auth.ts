/**
 * Local Auth System — manages sessions and accounts in localStorage.
 * Works without Supabase for in-house / dev-mode usage.
 *
 * WARNING: This is for local development only. Never use this in production
 * without Supabase configured. Sessions stored in localStorage are not secure
 * for multi-user production environments.
 */

// ── Dev account defaults ──────────────────────────────────────────────────────
export const DEV_EMAIL = "DEV@USA.COM";
export const DEV_PASSWORD = "Freedom1776";

// Sessions expire after 8 hours of inactivity (local mode only)
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

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
    if (!raw) return null;
    const session: LocalAuthSession = JSON.parse(raw);

    // Enforce 8-hour session expiry
    const loggedInAt = new Date(session.loggedInAt).getTime();
    if (Date.now() - loggedInAt > SESSION_TTL_MS) {
      localStorage.removeItem(LS_AUTH_KEY);
      return null;
    }

    return session;
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
  password: string;        // Plain text — local/dev mode only, never production
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
