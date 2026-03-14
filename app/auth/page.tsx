"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getLocalSession,
  setLocalSession,
  getLocalAccounts,
} from "@/lib/local-auth";

type AuthMode = "signin" | "forgot" | "forgot_sent";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPw, setShowPw] = useState(false);

  const isLocal = !supabase;

  useEffect(() => {
    if (isLocal) {
      const session = getLocalSession();
      if (session) { router.replace("/"); return; }
      setCheckingSession(false);
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) { router.replace("/"); }
        else { setCheckingSession(false); }
      });
    }
  }, [isLocal, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isLocal) {
      const accounts = getLocalAccounts();
      const account = accounts.find(
        (a) =>
          a.email.toLowerCase() === email.toLowerCase() &&
          a.password === password &&
          a.isActive
      );
      if (!account) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }
      setLocalSession({
        email: account.email,
        role: account.role,
        fullName: account.fullName,
        loggedInAt: new Date().toISOString(),
      });
      router.push("/");
    } else {
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Invalid email or password.";
        // Normalize Supabase error messages to user-friendly text
        if (msg.toLowerCase().includes("invalid login credentials") ||
            msg.toLowerCase().includes("invalid email or password")) {
          setError("Invalid email or password.");
        } else if (msg.toLowerCase().includes("email not confirmed")) {
          setError("Please verify your email address before signing in. Check your inbox.");
        } else {
          setError(msg);
        }
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");

    const redirectTo = typeof window !== "undefined"
      ? `${window.location.origin}/auth/reset`
      : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMode("forgot_sent");
    }
    setLoading(false);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white font-black text-lg animate-pulse">IO</div>
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 px-4">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-green-900/40 mb-4">
            IO
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Install Operations</h1>
          <p className="text-green-500/70 text-sm mt-1 font-medium">Field Management System</p>
        </div>

        {/* ── Sign In Card ── */}
        {mode === "signin" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl">
            <h2 className="text-base font-semibold text-gray-100 mb-6">Sign in to your account</h2>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-400 text-sm flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    Password
                  </label>
                  {!isLocal && (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(""); }}
                      className="text-xs text-green-500/70 hover:text-green-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs transition-colors"
                  >
                    {showPw ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : "Sign In"}
              </button>
            </form>
          </div>
        )}

        {/* ── Forgot Password Card ── */}
        {mode === "forgot" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl">
            <h2 className="text-base font-semibold text-gray-100 mb-2">Reset your password</h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email and we'll send you a reset link.
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-400 text-sm flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending…
                  </span>
                ) : "Send Reset Link"}
              </button>

              <button
                type="button"
                onClick={() => { setMode("signin"); setError(""); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Back to sign in
              </button>
            </form>
          </div>
        )}

        {/* ── Reset Email Sent Card ── */}
        {mode === "forgot_sent" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center mx-auto mb-4 text-2xl">
              ✉
            </div>
            <h2 className="text-base font-semibold text-gray-100 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500 mb-6">
              We sent a password reset link to <span className="text-gray-300 font-medium">{email}</span>.
              Check your inbox and spam folder.
            </p>
            <button
              onClick={() => { setMode("signin"); setError(""); }}
              className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-all border border-gray-700"
            >
              Back to sign in
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-600">
          {isLocal ? "Running in local dev mode — no Supabase connected" : "Access managed by your administrator"}
        </p>
      </div>
    </div>
  );
}
