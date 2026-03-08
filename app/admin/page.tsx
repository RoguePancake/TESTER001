"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Profile, Company, ActivityLog } from "@/lib/supabase";
import { normalizeRole } from "@/lib/engines/permissions";

// ── Types ─────────────────────────────────────────────────────────────────────

// Supabase returns the joined table under the relation name (plural table name)
interface UserRow extends Profile {
  companies?: Company;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalCompanies: number;
  timeEntriesToday: number;
  nafEntriesToday: number;
  unreadNotifications: number;
}

interface NewUserForm {
  email: string;
  password: string;
  fullName: string;
  role: string;
  companyId: string;
}

type AdminTab = "users" | "companies" | "activity" | "system";

const ROLE_OPTIONS = [
  { value: "employee", label: "Employee", color: "bg-gray-100 text-gray-700" },
  { value: "field_manager", label: "Field Manager", color: "bg-blue-100 text-blue-700" },
  { value: "company_owner", label: "Company Owner", color: "bg-purple-100 text-purple-700" },
  { value: "CreativeEditor", label: "CreativeEditor (Dev)", color: "bg-red-100 text-red-700" },
];

function roleBadge(role: string) {
  const opt = ROLE_OPTIONS.find((r) => r.value === role) ?? ROLE_OPTIONS[0];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${opt.color}`}>
      {opt.label}
    </span>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1 shadow-sm">
      <div className="text-2xl">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

// ── Create User Form ─────────────────────────────────────────────────────────

function CreateUserPanel({
  companies,
  onCreated,
}: {
  companies: Company[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState<NewUserForm>({
    email: "",
    password: "",
    fullName: "",
    role: "employee",
    companyId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (field: keyof NewUserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          companyId: form.companyId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");

      setSuccess(`Account created for ${form.fullName} (${form.email})`);
      setForm({ email: "", password: "", fullName: "", role: "employee", companyId: "" });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span>➕</span> Create In-House Account
      </h3>
      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">{success}</div>
      )}
      <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
          <input
            type="text"
            value={form.fullName}
            onChange={set("fullName")}
            placeholder="Jane Smith"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="jane@company.com"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Temporary Password *</label>
          <input
            type="text"
            value={form.password}
            onChange={set("password")}
            placeholder="Min 8 characters"
            required
            minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
          <select
            value={form.role}
            onChange={set("role")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Company (optional)</label>
          <select
            value={form.companyId}
            onChange={set("companyId")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white"
          >
            <option value="">— No company assigned —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Creating Account…" : "Create Account"}
          </button>
          <p className="mt-2 text-xs text-gray-400">
            No email confirmation required — account is active immediately. Share credentials with the user directly.
          </p>
        </div>
      </form>
    </div>
  );
}

// ── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({
  users,
  companies,
  loading,
  onRefresh,
}: {
  users: UserRow[];
  companies: Company[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const handleEditRole = async (profileId: string) => {
    setSaving(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profileId, updates: { role: editRole } }),
      });
      setEditingId(null);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (profileId: string, current: boolean) => {
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ profileId, updates: { is_active: !current } }),
    });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 min-w-[180px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {showCreate ? "✕ Cancel" : "➕ Create User"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateUserPanel
          companies={companies}
          onCreated={() => {
            setShowCreate(false);
            onRefresh();
          }}
        />
      )}

      {/* User table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {filtered.length} of {users.length} users
          </span>
          <button
            onClick={onRefresh}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No users match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Company</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Created</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{user.full_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{user.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      {editingId === user.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded bg-white"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleEditRole(user.id)}
                            disabled={saving}
                            className="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        roleBadge(user.role)
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {user.companies?.name ?? (user.company_id ? user.company_id.slice(0, 8) + "…" : "—")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        user.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingId(user.id);
                            setEditRole(user.role);
                          }}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                          title="Change role"
                        >
                          ✏️ Role
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            user.is_active
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                          title={user.is_active ? "Deactivate" : "Activate"}
                        >
                          {user.is_active ? "🔒 Deactivate" : "✅ Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Companies Tab ────────────────────────────────────────────────────────────

function CompaniesTab({
  companies,
  users,
  loading,
}: {
  companies: Company[];
  users: UserRow[];
  loading: boolean;
}) {
  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading companies…</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">{companies.length} companies</span>
      </div>
      {companies.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No companies found. Create companies via Supabase dashboard.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Company</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Slug</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Employees</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Max</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Created</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                const empCount = users.filter(
                  (u) => u.company_id === company.id && u.is_active,
                ).length;
                return (
                  <tr key={company.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{company.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{company.slug ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${empCount >= company.max_employees ? "text-red-600" : "text-gray-700"}`}>
                        {empCount}
                      </span>
                      <span className="text-gray-400 text-xs"> / {company.max_employees}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{company.max_employees}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        company.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {company.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(company.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Activity Log Tab ──────────────────────────────────────────────────────────

function ActivityTab({
  logs,
  users,
  loading,
}: {
  logs: ActivityLog[];
  users: UserRow[];
  loading: boolean;
}) {
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");

  const actions = Array.from(new Set(logs.map((l) => l.action)));
  const resources = Array.from(new Set(logs.map((l) => l.resource_type)));

  const filtered = logs.filter((l) => {
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    const matchResource = resourceFilter === "all" || l.resource_type === resourceFilter;
    return matchAction && matchResource;
  });

  const actorName = (actorId: string | null) => {
    if (!actorId) return "System";
    const u = users.find((u) => u.id === actorId);
    return u?.full_name ?? actorId.slice(0, 8) + "…";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="all">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="all">All Resources</option>
          {resources.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} entries (last 200)</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading activity log…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No activity log entries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Time</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Actor</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Resource</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">ID</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 font-medium text-xs">
                      {actorName(log.actor_id)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{log.resource_type}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">
                      {log.resource_id ? log.resource_id.slice(0, 12) + "…" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── System Status Tab ─────────────────────────────────────────────────────────

function SystemTab({ stats }: { stats: SystemStats | null }) {
  const envChecks = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      desc: "Supabase project URL",
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      desc: "Supabase anonymous key (public)",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Env var checks */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Environment Variables</h3>
        <div className="space-y-2">
          {envChecks.map((check) => (
            <div key={check.key} className="flex items-center gap-3">
              <span className={`text-lg ${check.ok ? "text-green-500" : "text-red-500"}`}>
                {check.ok ? "✓" : "✗"}
              </span>
              <div>
                <code className="text-xs font-mono text-gray-700">{check.key}</code>
                <span className="text-xs text-gray-400 ml-2">{check.desc}</span>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <span className="text-lg text-yellow-500">ℹ</span>
            <div>
              <code className="text-xs font-mono text-gray-700">SUPABASE_SERVICE_ROLE_KEY</code>
              <span className="text-xs text-gray-400 ml-2">Server-side only — required for admin user creation</span>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700 font-medium">Vercel Setup Checklist</p>
          <ul className="mt-2 space-y-1 text-xs text-blue-600 list-disc list-inside">
            <li>Set NEXT_PUBLIC_SUPABASE_URL in Vercel → Project → Settings → Environment Variables</li>
            <li>Set NEXT_PUBLIC_SUPABASE_ANON_KEY in the same location</li>
            <li>Set SUPABASE_SERVICE_ROLE_KEY (do NOT prefix with NEXT_PUBLIC — keeps it server-only)</li>
            <li>Run all 4 Supabase migrations (supabase/migrations/) before first login</li>
            <li>Redeploy after adding env vars</li>
          </ul>
        </div>
      </div>

      {/* Database counts */}
      {stats && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Database Counts</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Total Users", value: stats.totalUsers },
              { label: "Active Users", value: stats.activeUsers },
              { label: "Companies", value: stats.totalCompanies },
              { label: "Time Entries Today", value: stats.timeEntriesToday },
              { label: "NAF Entries Today", value: stats.nafEntriesToday },
              { label: "Unread Notifications", value: stats.unreadNotifications },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="text-xl font-bold text-gray-900">{item.value}</span>
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* App info */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">App Info</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span className="font-medium">App Name</span>
            <span>Jobsite Ops HQ</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Version</span>
            <span>0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Framework</span>
            <span>Next.js 15 + React 19</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Auth Mode</span>
            <span className="text-green-600 font-semibold">In-House (Admin Controlled)</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Self-Signup</span>
            <span className="text-red-600 font-semibold">Disabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabase) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    // Check current user is CreativeEditor
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
      setLoading(false);
      return;
    }

    // Load all data in parallel
    const [usersRes, companiesRes, logsRes, timeCountRes, nafCountRes, notifCountRes] =
      await Promise.all([
        supabase.from("profiles").select("*, companies(*)").order("created_at", { ascending: false }),
        supabase.from("companies").select("*").order("name"),
        supabase
          .from("activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("time_entries")
          .select("id", { count: "exact", head: true })
          .gte("clock_in", new Date().toISOString().slice(0, 10)),
        supabase
          .from("naf_entries")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date().toISOString().slice(0, 10)),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false),
      ]);

    const allUsers = (usersRes.data ?? []) as UserRow[];
    const allCompanies = (companiesRes.data ?? []) as Company[];

    setUsers(allUsers);
    setCompanies(allCompanies);
    setActivityLogs((logsRes.data ?? []) as ActivityLog[]);
    setStats({
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((u) => u.is_active).length,
      totalCompanies: allCompanies.length,
      timeEntriesToday: timeCountRes.count ?? 0,
      nafEntriesToday: nafCountRes.count ?? 0,
      unreadNotifications: notifCountRes.count ?? 0,
    });
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Access denied guard
  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-3">
          <div className="text-4xl">🚫</div>
          <h1 className="text-lg font-bold text-gray-900">Access Denied</h1>
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

  const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: "users", label: "Users", icon: "👥" },
    { id: "companies", label: "Companies", icon: "🏢" },
    { id: "activity", label: "Activity Log", icon: "📊" },
    { id: "system", label: "System", icon: "⚙️" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🛠 Dev / Admin Control Panel
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            In-house user & system management · CreativeEditor access only
          </p>
        </div>
        <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
          ADMIN
        </span>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon="👤" label="Total Users" value={stats.totalUsers} />
          <StatCard icon="✅" label="Active Users" value={stats.activeUsers} sub={`${stats.totalUsers - stats.activeUsers} inactive`} />
          <StatCard icon="🏢" label="Companies" value={stats.totalCompanies} />
          <StatCard icon="⏱" label="Clock-ins Today" value={stats.timeEntriesToday} />
          <StatCard icon="📋" label="NAF Entries Today" value={stats.nafEntriesToday} />
          <StatCard icon="🔔" label="Unread Alerts" value={stats.unreadNotifications} />
        </div>
      )}

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
      {tab === "users" && (
        <UsersTab
          users={users}
          companies={companies}
          loading={loading}
          onRefresh={loadData}
        />
      )}
      {tab === "companies" && (
        <CompaniesTab companies={companies} users={users} loading={loading} />
      )}
      {tab === "activity" && (
        <ActivityTab logs={activityLogs} users={users} loading={loading} />
      )}
      {tab === "system" && <SystemTab stats={stats} />}
    </div>
  );
}
