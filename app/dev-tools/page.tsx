"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getLocalSession, getLocalAccounts, saveLocalAccounts } from "@/lib/local-auth";
import type { LocalAccount } from "@/lib/local-auth";
import { normalizeRole } from "@/lib/engines/permissions";
import type { UserRole } from "@/lib/engines/permissions";

// ── Error/Crash Log System ────────────────────────────────────────────────────
const LS_ERROR_LOG = "jobsite_error_log";

interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: "error" | "warn" | "info" | "crash";
  source: string;
  message: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

function getErrorLog(): ErrorLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_ERROR_LOG);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addErrorLog(entry: Omit<ErrorLogEntry, "id" | "timestamp">) {
  const log = getErrorLog();
  log.unshift({
    ...entry,
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  });
  // Keep last 500 entries
  if (log.length > 500) log.length = 500;
  localStorage.setItem(LS_ERROR_LOG, JSON.stringify(log));
}

function clearErrorLog() {
  localStorage.removeItem(LS_ERROR_LOG);
}

// Install global error handlers
function installErrorHandlers() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    addErrorLog({
      level: "error",
      source: event.filename || "unknown",
      message: event.message,
      stack: event.error?.stack,
      metadata: { lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    addErrorLog({
      level: "crash",
      source: "unhandled-promise",
      message: String(event.reason?.message || event.reason || "Unknown rejection"),
      stack: event.reason?.stack,
    });
  });

  // Intercept console.error
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    addErrorLog({
      level: "error",
      source: "console.error",
      message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
    });
    originalError.apply(console, args);
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────
type DevTab = "accounts" | "errors" | "data" | "system";

const ROLE_OPTIONS = [
  { value: "employee", label: "Employee" },
  { value: "field_manager", label: "Field Manager" },
  { value: "company_owner", label: "Company Owner" },
  { value: "CreativeEditor", label: "CreativeEditor (Dev)" },
];

// ── Accounts Management Tab ───────────────────────────────────────────────────

function AccountsTab() {
  const [accounts, setAccounts] = useState<LocalAccount[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("employee");

  useEffect(() => {
    setAccounts(getLocalAccounts());
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim() || !newName.trim()) return;

    const existing = accounts.find(
      (a) => a.email.toLowerCase() === newEmail.toLowerCase()
    );
    if (existing) {
      alert("An account with this email already exists.");
      return;
    }

    const updated = [
      ...accounts,
      {
        email: newEmail.trim(),
        password: newPassword.trim(),
        fullName: newName.trim(),
        role: newRole,
        createdAt: new Date().toISOString(),
        isActive: true,
      },
    ];
    saveLocalAccounts(updated);
    setAccounts(updated);
    setNewEmail("");
    setNewPassword("");
    setNewName("");
    setNewRole("employee");
    setShowCreate(false);
  };

  const handleToggleActive = (email: string) => {
    const updated = accounts.map((a) =>
      a.email === email ? { ...a, isActive: !a.isActive } : a
    );
    saveLocalAccounts(updated);
    setAccounts(updated);
  };

  const handleChangeRole = (email: string, role: string) => {
    const updated = accounts.map((a) =>
      a.email === email ? { ...a, role } : a
    );
    saveLocalAccounts(updated);
    setAccounts(updated);
  };

  const handleDelete = (email: string) => {
    if (email.toUpperCase() === "DEV@USA.COM") {
      alert("Cannot delete the dev admin account.");
      return;
    }
    if (!confirm(`Delete account ${email}?`)) return;
    const updated = accounts.filter((a) => a.email !== email);
    saveLocalAccounts(updated);
    setAccounts(updated);
  };

  const handleResetPassword = (email: string) => {
    const newPw = prompt("Enter new password (min 6 chars):");
    if (!newPw || newPw.length < 6) return;
    const updated = accounts.map((a) =>
      a.email === email ? { ...a, password: newPw } : a
    );
    saveLocalAccounts(updated);
    setAccounts(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          User Accounts ({accounts.length})
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {showCreate ? "Cancel" : "+ Create Account"}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Full Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="John Smith"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Email *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                placeholder="john@company.com"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Password *</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min 6 chars"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Role *</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Create Account
          </button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Email</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Role</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Created</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acct) => (
                <tr key={acct.email} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{acct.fullName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{acct.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={acct.role}
                      onChange={(e) => handleChangeRole(acct.email, e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      acct.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}>
                      {acct.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(acct.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleResetPassword(acct.email)}
                        className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100"
                        title="Reset password"
                      >
                        Key
                      </button>
                      <button
                        onClick={() => handleToggleActive(acct.email)}
                        className={`text-xs px-2 py-1 rounded ${
                          acct.isActive
                            ? "bg-red-50 text-red-700 hover:bg-red-100"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {acct.isActive ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => handleDelete(acct.email)}
                        className="text-xs px-2 py-1 bg-gray-50 text-gray-500 rounded hover:bg-gray-100"
                        title="Delete account"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Error / Crash Log Tab ─────────────────────────────────────────────────────

function ErrorsTab() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "error" | "warn" | "info" | "crash">("all");

  useEffect(() => {
    setLogs(getErrorLog());
    const interval = setInterval(() => setLogs(getErrorLog()), 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === "all" ? logs : logs.filter((l) => l.level === filter);

  const levelColor = (level: string) => {
    switch (level) {
      case "crash": return "bg-red-600 text-white";
      case "error": return "bg-red-100 text-red-700";
      case "warn": return "bg-amber-100 text-amber-700";
      case "info": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const handleClear = () => {
    if (!confirm("Clear all error/crash logs?")) return;
    clearErrorLog();
    setLogs([]);
  };

  const handleTestError = () => {
    addErrorLog({
      level: "error",
      source: "dev-tools-test",
      message: "Test error triggered from Dev Tools at " + new Date().toLocaleTimeString(),
      metadata: { test: true },
    });
    setLogs(getErrorLog());
  };

  const handleTestCrash = () => {
    addErrorLog({
      level: "crash",
      source: "dev-tools-test",
      message: "Simulated crash log entry for testing",
      stack: "Error: Simulated crash\n    at DevTools.handleTestCrash\n    at onClick",
    });
    setLogs(getErrorLog());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {(["all", "crash", "error", "warn", "info"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-gray-800 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? `All (${logs.length})` : `${f} (${logs.filter((l) => l.level === f).length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleTestError}
            className="px-3 py-1 text-xs bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200"
          >
            + Test Error
          </button>
          <button
            onClick={handleTestCrash}
            className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
          >
            + Test Crash
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
          >
            Clear All
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-sm text-gray-500">No {filter === "all" ? "" : filter + " "}logs recorded.</p>
          <p className="text-xs text-gray-400 mt-1">
            Errors and crashes are captured automatically. Use test buttons above to generate sample entries.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 100).map((entry) => (
            <details
              key={entry.id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
            >
              <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-3">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${levelColor(entry.level)}`}>
                  {entry.level}
                </span>
                <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                <span className="text-sm text-gray-700 truncate flex-1">
                  {entry.message}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {entry.source}
                </span>
              </summary>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-2">
                <div>
                  <span className="text-xs font-semibold text-gray-600">Source:</span>
                  <span className="text-xs text-gray-500 ml-2 font-mono">{entry.source}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-600">Message:</span>
                  <p className="text-xs text-gray-700 mt-1 font-mono whitespace-pre-wrap">{entry.message}</p>
                </div>
                {entry.stack && (
                  <div>
                    <span className="text-xs font-semibold text-gray-600">Stack Trace:</span>
                    <pre className="text-xs text-gray-500 mt-1 font-mono whitespace-pre-wrap bg-gray-100 p-2 rounded overflow-x-auto">
                      {entry.stack}
                    </pre>
                  </div>
                )}
                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-600">Metadata:</span>
                    <pre className="text-xs text-gray-500 mt-1 font-mono whitespace-pre-wrap bg-gray-100 p-2 rounded">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          ))}
          {filtered.length > 100 && (
            <p className="text-xs text-gray-400 text-center">Showing 100 of {filtered.length} entries</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Core Data Viewer Tab ──────────────────────────────────────────────────────

function DataTab() {
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [data, setData] = useState<string>("");

  const LS_KEYS = [
    { key: "payclock_entries", label: "Pay Clock Entries" },
    { key: "payclock_profiles", label: "Pay Clock Crew Profiles" },
    { key: "payclock_counter", label: "Pay Clock ID Counter" },
    { key: "jobsite_accounts", label: "User Accounts" },
    { key: "jobsite_auth", label: "Current Auth Session" },
    { key: "jobsite_error_log", label: "Error/Crash Log" },
    { key: "notepad_logs", label: "Notepad Logs" },
    { key: "notepad_deliveries", label: "Notepad Deliveries" },
    { key: "display_preferences", label: "Display Preferences" },
    { key: "jobsite_settings", label: "App Settings" },
  ];

  useEffect(() => {
    if (!selectedKey) {
      setData("");
      return;
    }
    try {
      const raw = localStorage.getItem(selectedKey);
      if (raw) {
        try {
          setData(JSON.stringify(JSON.parse(raw), null, 2));
        } catch {
          setData(raw);
        }
      } else {
        setData("(empty / not set)");
      }
    } catch {
      setData("(error reading key)");
    }
  }, [selectedKey]);

  const allKeys = Object.keys(localStorage).sort();
  const storageSize = allKeys.reduce((sum, k) => {
    const v = localStorage.getItem(k);
    return sum + (k.length + (v?.length ?? 0)) * 2; // UTF-16 = 2 bytes/char
  }, 0);

  const handleExportAll = () => {
    const dump: Record<string, unknown> = {};
    for (const k of allKeys) {
      try {
        const v = localStorage.getItem(k);
        dump[k] = v ? JSON.parse(v) : null;
      } catch {
        dump[k] = localStorage.getItem(k);
      }
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobsite-ops-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearKey = () => {
    if (!selectedKey) return;
    if (!confirm(`Clear localStorage key "${selectedKey}"?`)) return;
    localStorage.removeItem(selectedKey);
    setData("(cleared)");
  };

  return (
    <div className="space-y-4">
      {/* Storage overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{allKeys.length}</div>
          <div className="text-xs text-gray-500">Storage Keys</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {(storageSize / 1024).toFixed(1)}KB
          </div>
          <div className="text-xs text-gray-500">Total Size</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-gray-900">5MB</div>
          <div className="text-xs text-gray-500">Storage Limit</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-green-700">
            {((storageSize / (5 * 1024 * 1024)) * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Used</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="">-- Select data store --</option>
          <optgroup label="App Data">
            {LS_KEYS.map((k) => (
              <option key={k.key} value={k.key}>{k.label} ({k.key})</option>
            ))}
          </optgroup>
          <optgroup label="All Keys">
            {allKeys
              .filter((k) => !LS_KEYS.find((lk) => lk.key === k))
              .map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
          </optgroup>
        </select>
        <button
          onClick={handleExportAll}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Export All
        </button>
        {selectedKey && (
          <button
            onClick={handleClearKey}
            className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            Clear Key
          </button>
        )}
      </div>

      {data && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-mono text-gray-600">{selectedKey}</span>
            <span className="text-xs text-gray-400">
              {(localStorage.getItem(selectedKey)?.length ?? 0).toLocaleString()} chars
            </span>
          </div>
          <pre className="p-4 text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto max-h-[500px] overflow-y-auto">
            {data}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── System Info Tab ───────────────────────────────────────────────────────────

function SystemInfoTab() {
  const [perfData, setPerfData] = useState<Record<string, string>>({});

  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const info: Record<string, string> = {
      "User Agent": navigator.userAgent,
      "Platform": navigator.platform,
      "Language": navigator.language,
      "Online": navigator.onLine ? "Yes" : "No",
      "Cookie Enabled": navigator.cookieEnabled ? "Yes" : "No",
      "Screen Resolution": `${screen.width}x${screen.height}`,
      "Window Size": `${window.innerWidth}x${window.innerHeight}`,
      "Device Pixel Ratio": String(window.devicePixelRatio),
      "Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
      "Memory (JS Heap)": (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory
        ? `${((performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB / ${((performance as unknown as { memory: { totalJSHeapSize: number } }).memory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`
        : "N/A",
      "Page Load Time": nav ? `${Math.round(nav.loadEventEnd - nav.startTime)}ms` : "N/A",
      "DOM Content Loaded": nav ? `${Math.round(nav.domContentLoadedEventEnd - nav.startTime)}ms` : "N/A",
      "Connection Type": (navigator as unknown as { connection?: { effectiveType: string } }).connection?.effectiveType ?? "N/A",
      "Supabase Connected": supabase ? "Yes" : "No (Local Mode)",
      "Auth Mode": supabase ? "Supabase Auth" : "In-House Local Auth",
    };
    setPerfData(info);
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">System & Browser Info</h3>
        <div className="space-y-2">
          {Object.entries(perfData).map(([key, val]) => (
            <div key={key} className="flex justify-between items-start gap-4">
              <span className="text-xs font-medium text-gray-600 whitespace-nowrap">{key}</span>
              <span className="text-xs text-gray-500 text-right font-mono break-all">{val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">App Configuration</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">App Name</span>
            <span className="text-gray-500">Jobsite Ops HQ</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Version</span>
            <span className="text-gray-500">0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Framework</span>
            <span className="text-gray-500">Next.js 15 + React 19</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Auth System</span>
            <span className="text-green-600 font-semibold">In-House (Admin Controlled)</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Self-Signup</span>
            <span className="text-red-600 font-semibold">Disabled</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Data Storage</span>
            <span className="text-gray-500">{supabase ? "Supabase (PostgreSQL)" : "localStorage (Device)"}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Error Logging</span>
            <span className="text-green-600 font-semibold">Active</span>
          </div>
        </div>
      </div>

      {supabase && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Environment Variables</h3>
          <div className="space-y-2">
            {[
              { key: "NEXT_PUBLIC_SUPABASE_URL", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
              { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
            ].map((check) => (
              <div key={check.key} className="flex items-center gap-3">
                <span className={`text-lg ${check.ok ? "text-green-500" : "text-red-500"}`}>
                  {check.ok ? "✓" : "✗"}
                </span>
                <code className="text-xs font-mono text-gray-700">{check.key}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DevToolsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<DevTab>("accounts");
  const [accessDenied, setAccessDenied] = useState(false);
  const [checking, setChecking] = useState(true);

  // Install error handlers on first load
  useEffect(() => {
    installErrorHandlers();
  }, []);

  // Access check
  const checkAccess = useCallback(async () => {
    const isLocal = !supabase;

    if (isLocal) {
      const session = getLocalSession();
      if (!session) {
        router.replace("/auth");
        return;
      }
      const role = normalizeRole(session.role) as UserRole;
      if (role !== "CreativeEditor") {
        setAccessDenied(true);
      }
      setChecking(false);
      return;
    }

    // Supabase mode
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.replace("/auth");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_id", sessionData.session.user.id)
      .single();
    if (normalizeRole(profile?.role ?? "") !== "CreativeEditor") {
      setAccessDenied(true);
    }
    setChecking(false);
  }, [router]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  if (checking) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm animate-pulse">
        Loading Dev Tools...
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h1 className="text-lg font-bold text-gray-900">Dev Tools — Access Denied</h1>
          <p className="text-sm text-gray-500">
            This page is restricted to <strong>CreativeEditor</strong> accounts only.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors"
          >
            Go to Field Office
          </button>
        </div>
      </div>
    );
  }

  const TABS: { id: DevTab; label: string; icon: string }[] = [
    { id: "accounts", label: "Accounts", icon: "👥" },
    { id: "errors", label: "Errors & Crashes", icon: "🐛" },
    { id: "data", label: "Core Data", icon: "💾" },
    { id: "system", label: "System Info", icon: "🖥" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🔬 Dev Tools
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            System diagnostics, error logs, account management & core data viewer
          </p>
        </div>
        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
          DEV ONLY
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-red-700">
            {getErrorLog().filter((e) => e.level === "crash").length}
          </div>
          <div className="text-xs text-red-600">Crashes</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-700">
            {getErrorLog().filter((e) => e.level === "error").length}
          </div>
          <div className="text-xs text-amber-600">Errors</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">
            {getLocalAccounts().length}
          </div>
          <div className="text-xs text-blue-600">Accounts</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-700">
            {Object.keys(localStorage).length}
          </div>
          <div className="text-xs text-green-600">Data Keys</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.id
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "accounts" && <AccountsTab />}
      {tab === "errors" && <ErrorsTab />}
      {tab === "data" && <DataTab />}
      {tab === "system" && <SystemInfoTab />}
    </div>
  );
}
