"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Profile, Company, ActivityLog } from "@/lib/supabase";
import { normalizeRole } from "@/lib/engines/permissions";
import { getLocalSession, getLocalAccounts, saveLocalAccounts } from "@/lib/local-auth";
import type { LocalAccount } from "@/lib/local-auth";

const isLocal = !supabase;

// ── Types ─────────────────────────────────────────────────────────────────────

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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-1 shadow-sm">
      <div className="text-2xl">{icon}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

// ── Local Users Tab ─────────────────────────────────────────────────────────

function LocalUsersTab() {
  const [accounts, setAccounts] = useState<LocalAccount[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("employee");

  useEffect(() => { setAccounts(getLocalAccounts()); }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim() || !newName.trim()) return;
    if (accounts.find((a) => a.email.toLowerCase() === newEmail.toLowerCase())) {
      alert("An account with this email already exists.");
      return;
    }
    const updated = [...accounts, {
      email: newEmail.trim(),
      password: newPassword.trim(),
      fullName: newName.trim(),
      role: newRole,
      createdAt: new Date().toISOString(),
      isActive: true,
    }];
    saveLocalAccounts(updated);
    setAccounts(updated);
    setNewEmail(""); setNewPassword(""); setNewName(""); setNewRole("employee");
    setShowCreate(false);
  };

  const handleToggleActive = (email: string) => {
    const updated = accounts.map((a) => a.email === email ? { ...a, isActive: !a.isActive } : a);
    saveLocalAccounts(updated); setAccounts(updated);
  };

  const handleChangeRole = (email: string, role: string) => {
    const updated = accounts.map((a) => a.email === email ? { ...a, role } : a);
    saveLocalAccounts(updated); setAccounts(updated);
  };

  const handleDelete = (email: string) => {
    if (email.toUpperCase() === "DEV@USA.COM") { alert("Cannot delete the dev admin account."); return; }
    if (!confirm(`Delete account ${email}?`)) return;
    const updated = accounts.filter((a) => a.email !== email);
    saveLocalAccounts(updated); setAccounts(updated);
  };

  const handleResetPassword = (email: string) => {
    const newPw = prompt("Enter new password (min 6 chars):");
    if (!newPw || newPw.length < 6) return;
    const updated = accounts.map((a) => a.email === email ? { ...a, password: newPw } : a);
    saveLocalAccounts(updated); setAccounts(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">User Accounts ({accounts.length})</h3>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors">
          {showCreate ? "Cancel" : "+ Create Account"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Full Name *</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="John Smith"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Email *</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required placeholder="john@company.com"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Password *</label>
              <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Min 6 chars"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Role *</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
            Create Account
          </button>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase">Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase">Email</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase">Role</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase">Created</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acct) => (
                <tr key={acct.email} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{acct.fullName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{acct.email}</td>
                  <td className="px-4 py-3">
                    <select value={acct.role} onChange={(e) => handleChangeRole(acct.email, e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded bg-white">
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${acct.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {acct.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(acct.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleResetPassword(acct.email)} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100" title="Reset password">Key</button>
                      <button onClick={() => handleToggleActive(acct.email)}
                        className={`text-xs px-2 py-1 rounded ${acct.isActive ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                        {acct.isActive ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => handleDelete(acct.email)} className="text-xs px-2 py-1 bg-gray-50 text-gray-500 rounded hover:bg-gray-100" title="Delete account">Del</button>
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

// ── Create User Form (Supabase mode) ─────────────────────────────────────────

function CreateUserPanel({ companies, onCreated }: { companies: Company[]; onCreated: () => void }) {
  const [form, setForm] = useState<NewUserForm>({ email: "", password: "", fullName: "", role: "employee", companyId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (field: keyof NewUserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: form.email, password: form.password, fullName: form.fullName, role: form.role, companyId: form.companyId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");
      setSuccess(`Account created for ${form.fullName} (${form.email})`);
      setForm({ email: "", password: "", fullName: "", role: "employee", companyId: "" });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Create In-House Account</h3>
      {error && <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}
      {success && <div className="mb-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">{success}</div>}
      <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
          <input type="text" value={form.fullName} onChange={set("fullName")} placeholder="Jane Smith" required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
          <input type="email" value={form.email} onChange={set("email")} placeholder="jane@company.com" required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Temporary Password *</label>
          <input type="text" value={form.password} onChange={set("password")} placeholder="Min 8 characters" required minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
          <select value={form.role} onChange={set("role")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white">
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Company (optional)</label>
          <select value={form.companyId} onChange={set("companyId")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white">
            <option value="">— No company assigned —</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
            {saving ? "Creating Account..." : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Users Tab (Supabase) ────────────────────────────────────────────────────

function UsersTab({ users, companies, loading, onRefresh }: { users: UserRow[]; companies: Company[]; loading: boolean; onRefresh: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || (statusFilter === "active" ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const handleEditRole = async (profileId: string) => {
    setSaving(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profileId, updates: { role: editRole } }),
      });
      setEditingId(null);
      onRefresh();
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (profileId: string, current: boolean) => {
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ profileId, updates: { is_active: !current } }),
    });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..."
          className="flex-1 min-w-[180px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600">
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={() => setShowCreate((v) => !v)}
          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors">
          {showCreate ? "Cancel" : "Create User"}
        </button>
      </div>

      {showCreate && <CreateUserPanel companies={companies} onCreated={() => { setShowCreate(false); onRefresh(); }} />}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">{filtered.length} of {users.length} users</span>
          <button onClick={onRefresh} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Refresh</button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No users match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{user.full_name}</td>
                    <td className="px-4 py-3">
                      {editingId === user.id ? (
                        <div className="flex items-center gap-1">
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="text-xs px-2 py-1 border border-gray-300 rounded bg-white">
                            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          <button onClick={() => handleEditRole(user.id)} disabled={saving} className="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Cancel</button>
                        </div>
                      ) : roleBadge(user.role)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setEditingId(user.id); setEditRole(user.role); }}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">Role</button>
                        <button onClick={() => handleToggleActive(user.id, user.is_active)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${user.is_active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                          {user.is_active ? "Deactivate" : "Activate"}
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

function CompaniesTab({ companies, users, loading }: { companies: Company[]; users: UserRow[]; loading: boolean }) {
  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading companies...</div>;
  if (companies.length === 0) return <div className="p-8 text-center text-gray-400 text-sm">No companies found.</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Company</th>
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Employees</th>
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const empCount = users.filter((u) => u.company_id === company.id && u.is_active).length;
              return (
                <tr key={company.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{company.name}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${empCount >= company.max_employees ? "text-red-600" : "text-gray-700"}`}>{empCount}</span>
                    <span className="text-gray-400 text-xs"> / {company.max_employees}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${company.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {company.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Activity Log Tab ──────────────────────────────────────────────────────────

function ActivityTab({ logs, users, loading }: { logs: ActivityLog[]; users: UserRow[]; loading: boolean }) {
  const [actionFilter, setActionFilter] = useState("all");
  const actions = Array.from(new Set(logs.map((l) => l.action)));
  const filtered = logs.filter((l) => actionFilter === "all" || l.action === actionFilter);

  const actorName = (actorId: string | null) => {
    if (!actorId) return "System";
    const u = users.find((u) => u.id === actorId);
    return u?.full_name ?? actorId.slice(0, 8) + "...";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="all">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} entries</span>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading activity log...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No activity log entries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Time</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Actor</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Action</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase">Resource</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-gray-700 font-medium text-xs">{actorName(log.actor_id)}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">{log.action}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{log.resource_type}</td>
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
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">System Info</h3>
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex justify-between"><span className="font-medium">App Name</span><span>Jobsite Ops HQ</span></div>
          <div className="flex justify-between"><span className="font-medium">Version</span><span>0.1.0</span></div>
          <div className="flex justify-between"><span className="font-medium">Framework</span><span>Next.js 15 + React 19</span></div>
          <div className="flex justify-between"><span className="font-medium">Auth Mode</span><span className="text-green-600 font-semibold">{isLocal ? "In-House (Local)" : "Supabase"}</span></div>
          <div className="flex justify-between"><span className="font-medium">Data Storage</span><span>{isLocal ? "localStorage (Device)" : "Supabase (PostgreSQL)"}</span></div>
        </div>
      </div>
      {stats && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Database Counts</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Total Users", value: stats.totalUsers },
              { label: "Active Users", value: stats.activeUsers },
              { label: "Companies", value: stats.totalCompanies },
              { label: "Time Entries Today", value: stats.timeEntriesToday },
              { label: "NAF Entries Today", value: stats.nafEntriesToday },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{item.value}</span>
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
    if (isLocal) {
      // Check local session for admin access
      const session = getLocalSession();
      if (!session) { router.replace("/auth"); return; }
      const role = normalizeRole(session.role);
      if (role !== "CreativeEditor" && role !== "company_owner") {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      // Load local data
      const accounts = getLocalAccounts();
      const localEntries = JSON.parse(localStorage.getItem("payclock_entries") || "[]");
      const localNotes = JSON.parse(localStorage.getItem("notepad_logs") || "[]");
      setStats({
        totalUsers: accounts.length,
        activeUsers: accounts.filter(a => a.isActive).length,
        totalCompanies: 0,
        timeEntriesToday: localEntries.length,
        nafEntriesToday: localNotes.length,
        unreadNotifications: 0,
      });
      setLoading(false);
      return;
    }

    // Supabase mode
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { router.replace("/auth"); return; }

    const { data: profile } = await supabase.from("profiles").select("role").eq("auth_id", sessionData.session.user.id).single();
    const role = normalizeRole(profile?.role ?? "");
    if (role !== "CreativeEditor" && role !== "company_owner") {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    const [usersRes, companiesRes, logsRes, timeCountRes, nafCountRes, notifCountRes] = await Promise.all([
      supabase.from("profiles").select("*, companies(*)").order("created_at", { ascending: false }),
      supabase.from("companies").select("*").order("name"),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("time_entries").select("id", { count: "exact", head: true }).gte("clock_in", new Date().toISOString().slice(0, 10)),
      supabase.from("naf_entries").select("id", { count: "exact", head: true }).gte("created_at", new Date().toISOString().slice(0, 10)),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
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

  useEffect(() => { loadData(); }, [loadData]);

  if (accessDenied) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h1 className="text-lg font-bold text-gray-900">Access Denied</h1>
          <p className="text-sm text-gray-500">This page is restricted to admin accounts only.</p>
          <button onClick={() => router.push("/")}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors">
            Go to Field Office
          </button>
        </div>
      </div>
    );
  }

  const TABS: { id: AdminTab; label: string; icon: string }[] = isLocal
    ? [
        { id: "users", label: "Users", icon: "👥" },
        { id: "system", label: "System", icon: "⚙️" },
      ]
    : [
        { id: "users", label: "Users", icon: "👥" },
        { id: "companies", label: "Companies", icon: "🏢" },
        { id: "activity", label: "Activity Log", icon: "📊" },
        { id: "system", label: "System", icon: "⚙️" },
      ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Admin Control Panel</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLocal ? "Local mode — manage accounts and settings" : "In-house user & system management"}
          </p>
        </div>
        <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">ADMIN</span>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon="👤" label="Total Users" value={stats.totalUsers} />
          <StatCard icon="✅" label="Active Users" value={stats.activeUsers} sub={`${stats.totalUsers - stats.activeUsers} inactive`} />
          <StatCard icon="🏢" label="Companies" value={stats.totalCompanies} />
          <StatCard icon="⏱" label="Clock-ins" value={stats.timeEntriesToday} />
          <StatCard icon="📋" label="Notes" value={stats.nafEntriesToday} />
          <StatCard icon="🔔" label="Unread" value={stats.unreadNotifications} />
        </div>
      )}

      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}>
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "users" && (isLocal ? <LocalUsersTab /> : <UsersTab users={users} companies={companies} loading={loading} onRefresh={loadData} />)}
      {tab === "companies" && !isLocal && <CompaniesTab companies={companies} users={users} loading={loading} />}
      {tab === "activity" && !isLocal && <ActivityTab logs={activityLogs} users={users} loading={loading} />}
      {tab === "system" && <SystemTab stats={stats} />}
    </div>
  );
}
