"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ResetState = "loading" | "ready" | "success" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<ResetState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setState("error");
      setError("Supabase is not configured. Password reset is unavailable in local mode.");
      return;
    }

    // Supabase fires PASSWORD_RECOVERY when the user arrives from the reset email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setState("ready");
      } else if (event === "SIGNED_IN") {
        // User already has a valid session — unlikely on this page but handle gracefully
        setState("ready");
      }
    });

    // If there's already a session (e.g. token in hash already processed), show the form
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setState("ready");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setState("success");
      setTimeout(() => router.replace("/"), 2500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 px-4">
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

        {/* Loading */}
        {state === "loading" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl text-center">
            <div className="w-8 h-8 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-400">Verifying reset link…</p>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-700/50 flex items-center justify-center mx-auto mb-4 text-2xl">
              ✕
            </div>
            <h2 className="text-base font-semibold text-gray-100 mb-2">Link expired or invalid</h2>
            <p className="text-sm text-gray-500 mb-6">
              {error || "This reset link is no longer valid. Please request a new one."}
            </p>
            <button
              onClick={() => router.replace("/auth")}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-xl transition-all"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Set new password */}
        {state === "ready" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl">
            <h2 className="text-base font-semibold text-gray-100 mb-2">Set a new password</h2>
            <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-400 text-sm flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
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

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  Confirm Password
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating…
                  </span>
                ) : "Update Password"}
              </button>
            </form>
          </div>
        )}

        {/* Success */}
        {state === "success" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center mx-auto mb-4 text-2xl">
              ✓
            </div>
            <h2 className="text-base font-semibold text-gray-100 mb-2">Password updated</h2>
            <p className="text-sm text-gray-500">Redirecting you to the dashboard…</p>
          </div>
        )}
      </div>
    </div>
  );
}
