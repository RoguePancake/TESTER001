"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // If Supabase isn't configured, skip auth entirely
  const supabaseReady = Boolean(supabase);

  useEffect(() => {
    if (!supabaseReady) {
      router.replace("/");
      return;
    }
    // If already logged in, go to home
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [supabaseReady, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/");
      } else {
        if (!fullName.trim()) throw new Error("Full name is required");
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpError) throw signUpError;
        setMessage("Account created! Check your email to confirm, then sign in.");
        setMode("login");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🏗</div>
        <h1 className="text-2xl font-bold text-gray-900">Jobsite Ops</h1>
        <p className="text-sm text-gray-500 mt-1">Field Management Operating System</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        {/* Tab switcher */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); setMessage(""); }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
              mode === "login" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(""); setMessage(""); }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
              mode === "signup" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Success message */}
        {message && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
            {message}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name - sign up only */}
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </div>
          )}

          {/* Email */}
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

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
              required
              minLength={mode === "signup" ? 8 : 1}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? mode === "login" ? "Signing in…" : "Creating account…"
              : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Demo mode note */}
        <p className="mt-4 text-center text-xs text-gray-400">
          {mode === "login"
            ? "No account yet? Switch to Sign Up above."
            : "Already have an account? Switch to Sign In above."}
        </p>
      </div>

      {/* Role info */}
      <div className="mt-6 max-w-sm w-full">
        <details className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-xs text-gray-500">
          <summary className="font-medium text-gray-600 cursor-pointer">Platform roles</summary>
          <ul className="mt-3 space-y-1.5 list-none">
            <li><span className="font-semibold text-purple-700">CreativeEditor</span> — Platform root (developer)</li>
            <li><span className="font-semibold text-blue-700">Company Owner</span> — Full company admin</li>
            <li><span className="font-semibold text-green-700">Field Manager</span> — Manage crews & jobs</li>
            <li><span className="font-semibold text-gray-700">Employee</span> — Clock in, log notes</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
