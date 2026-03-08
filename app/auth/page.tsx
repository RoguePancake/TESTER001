"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If Supabase isn't configured, skip auth (demo/dev mode)
  const supabaseReady = Boolean(supabase);

  useEffect(() => {
    if (!supabaseReady) {
      router.replace("/");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [supabaseReady, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      router.push("/");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!supabaseReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500 text-sm">Redirecting to app…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🏗</div>
        <h1 className="text-2xl font-bold text-gray-900">Jobsite Ops</h1>
        <p className="text-sm text-gray-500 mt-1">
          Field Management Operating System
        </p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-base font-semibold text-gray-800 mb-5">
          Sign In
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-gray-400">
          Access is managed by your administrator.
          <br />
          Contact your admin if you need an account.
        </p>
      </div>

      {/* Role reference — collapsed by default */}
      <div className="mt-6 max-w-sm w-full">
        <details className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-xs text-gray-500">
          <summary className="font-medium text-gray-600 cursor-pointer">
            Platform roles
          </summary>
          <ul className="mt-3 space-y-1.5 list-none">
            <li>
              <span className="font-semibold text-red-700">CreativeEditor</span>{" "}
              — Platform root / admin panel access
            </li>
            <li>
              <span className="font-semibold text-purple-700">
                Company Owner
              </span>{" "}
              — Full company admin
            </li>
            <li>
              <span className="font-semibold text-blue-700">Field Manager</span>{" "}
              — Manage crews &amp; jobs
            </li>
            <li>
              <span className="font-semibold text-gray-700">Employee</span> —
              Clock in, log notes
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}
