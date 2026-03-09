"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  DEV_EMAIL,
  DEV_PASSWORD,
  getLocalSession,
  setLocalSession,
  getLocalAccounts,
} from "@/lib/local-auth";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEV_EMAIL);
  const [password, setPassword] = useState(DEV_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  const isLocal = !supabase;

  // Check existing session on mount
  useEffect(() => {
    if (isLocal) {
      const session = getLocalSession();
      if (session) {
        router.replace("/");
        return;
      }
      setCheckingSession(false);
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          router.replace("/");
        } else {
          setCheckingSession(false);
        }
      });
    }
  }, [isLocal, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isLocal) {
      // Local auth mode
      const accounts = getLocalAccounts();
      const account = accounts.find(
        (a) =>
          a.email.toLowerCase() === email.toLowerCase() &&
          a.password === password &&
          a.isActive
      );

      if (!account) {
        setError("Invalid email or password. Check credentials and try again.");
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
      // Supabase auth mode
      try {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/");
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Invalid email or password."
        );
      }
    }
    setLoading(false);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-400 text-sm animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🏗</div>
        <h1 className="text-2xl font-bold text-gray-900">Jobsite Ops HQ</h1>
        <p className="text-sm text-gray-500 mt-1">
          Field Management Operating System
        </p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Sign In</h2>
        <p className="text-xs text-gray-400 mb-5">
          {isLocal ? "Local Mode — No cloud connection" : "Connected to Supabase"}
        </p>

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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Dev credentials hint */}
        {isLocal && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              Dev Login Pre-filled
            </p>
            <p className="text-xs text-amber-700">
              Email: <code className="font-mono bg-amber-100 px-1 rounded">{DEV_EMAIL}</code>
              <br />
              Password: <code className="font-mono bg-amber-100 px-1 rounded">{DEV_PASSWORD}</code>
            </p>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-gray-400">
          Access is managed by your administrator.
          <br />
          Contact your admin if you need an account.
        </p>
      </div>

      {/* Role reference */}
      <div className="mt-6 max-w-sm w-full">
        <details className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-xs text-gray-500">
          <summary className="font-medium text-gray-600 cursor-pointer">
            Platform roles
          </summary>
          <ul className="mt-3 space-y-1.5 list-none">
            <li>
              <span className="font-semibold text-red-700">CreativeEditor</span>{" "}
              — Platform root / admin panel + dev tools access
            </li>
            <li>
              <span className="font-semibold text-purple-700">Company Owner</span>{" "}
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
