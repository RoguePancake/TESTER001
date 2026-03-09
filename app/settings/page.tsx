"use client";

import { useEffect, useState, useCallback } from "react";
import {
  supabase,
  type Profile,
  type JobSite,
} from "@/lib/supabase";
import {
  applyDisplayPreferences,
  loadDisplayPreferences,
  normalizeDisplayPreferences,
  saveDisplayPreferences,
  type LayoutPreference,
  type ThemePreference,
} from "@/lib/display-preferences";

const isLocal = !supabase;

// ── localStorage helpers ──────────────────────────────────────────────
const LS_SETTINGS = "jobsite_settings";
const LS_CREW = "jobsite_crew";
const LS_SITES = "jobsite_sites";

function getLocalSettings(key: string): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}");
    return all[key] || null;
  } catch { return null; }
}

function saveLocalSettings(key: string, value: Record<string, unknown>) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}");
    all[key] = value;
    localStorage.setItem(LS_SETTINGS, JSON.stringify(all));
  } catch {
    localStorage.setItem(LS_SETTINGS, JSON.stringify({ [key]: value }));
  }
}

function getLocalCrew(): Profile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_CREW);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalCrew(crew: Profile[]) {
  localStorage.setItem(LS_CREW, JSON.stringify(crew));
}

function getLocalSites(): JobSite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_SITES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalSites(sites: JobSite[]) {
  localStorage.setItem(LS_SITES, JSON.stringify(sites));
}

function nextId(): string {
  const c = parseInt(localStorage.getItem("settings_counter") || "0", 10) + 1;
  localStorage.setItem("settings_counter", String(c));
  return `local-${c}`;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface CompanySettings {
  name: string;
  phone: string;
  email: string;
  logo_url: string;
}

interface HoursSettings {
  default_break_minutes: number;
  overtime_threshold: number;
  overtime_rate: number;
  pay_period: string;
  week_start: string;
}

interface DisplaySettings {
  time_format: string;
  date_format: string;
  theme: ThemePreference;
  accent_color: string;
  layout_mode: LayoutPreference;
}

interface NotificationSettings {
  clock_reminder: boolean;
  delivery_alerts: boolean;
  daily_summary: boolean;
  reminder_time: string;
}

interface NafSettings {
  default_entry_type: string;
  auto_tag_jobs: boolean;
  show_weather: boolean;
  entries_per_page: number;
}

// ══════════════════════════════════════════════════════════════════════════
// COMPANY SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════

function CompanyTab() {
  const [settings, setSettings] = useState<CompanySettings>({
    name: "Install Operations",
    phone: "",
    email: "",
    logo_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      if (isLocal) {
        const data = getLocalSettings("company");
        if (data) setSettings(data as unknown as CompanySettings);
        return;
      }
      const { data } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", "company")
        .single();
      if (data) setSettings(data.value as unknown as CompanySettings);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    if (isLocal) {
      saveLocalSettings("company", settings as unknown as Record<string, unknown>);
    } else {
      await supabase
        .from("app_settings")
        .upsert({ key: "company", value: settings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Company Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
            <input type="text" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input type="tel" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="ops@company.com"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL</label>
            <input type="url" value={settings.logo_url} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save Company Settings"}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CREW MANAGEMENT TAB
// ══════════════════════════════════════════════════════════════════════════

function CrewTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("installer");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  const fetchProfiles = useCallback(async () => {
    if (isLocal) {
      setProfiles(getLocalCrew());
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("is_active", { ascending: false })
      .order("full_name");
    if (data) setProfiles(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    if (isLocal) {
      const crew = getLocalCrew();
      crew.push({
        id: nextId(),
        full_name: newName.trim(),
        role: newRole,
        is_active: true,
        created_at: new Date().toISOString(),
      });
      saveLocalCrew(crew);
    } else {
      await supabase.from("profiles").insert({
        full_name: newName.trim(),
        role: newRole,
        is_active: true,
      });
    }
    setNewName("");
    setNewRole("installer");
    setShowAdd(false);
    setAdding(false);
    fetchProfiles();
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    if (isLocal) {
      const crew = getLocalCrew().map(p => p.id === id ? { ...p, is_active: !currentActive } : p);
      saveLocalCrew(crew);
    } else {
      await supabase.from("profiles").update({ is_active: !currentActive }).eq("id", id);
    }
    fetchProfiles();
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    if (isLocal) {
      const crew = getLocalCrew().map(p => p.id === id ? { ...p, full_name: editName.trim(), role: editRole } : p);
      saveLocalCrew(crew);
    } else {
      await supabase.from("profiles").update({ full_name: editName.trim(), role: editRole }).eq("id", id);
    }
    setEditingId(null);
    fetchProfiles();
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(`Delete ${name}? This cannot be undone.`);
    if (!confirmed) return;
    if (isLocal) {
      const crew = getLocalCrew().filter(p => p.id !== id);
      saveLocalCrew(crew);
    } else {
      await supabase.from("profiles").delete().eq("id", id);
    }
    fetchProfiles();
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading crew...</div>;

  const ROLES = ["owner", "foreman", "installer", "laborer"];
  const ROLE_COLORS: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700",
    foreman: "bg-blue-100 text-blue-700",
    installer: "bg-green-100 text-green-700",
    laborer: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">
            Crew Members
            <span className="text-sm text-gray-400 font-normal ml-2">({profiles.filter((p) => p.is_active).length} active)</span>
          </h3>
          <button onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors">
            + Add Crew Member
          </button>
        </div>

        {showAdd && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-green-800 mb-3">New Crew Member</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">Full Name *</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Smith"
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={handleAdd} disabled={adding || !newName.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700">
                  {adding ? "Adding..." : "Add"}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {profiles.length === 0 && <p className="text-sm text-gray-400">No crew members yet. Add your first one above.</p>}
          {profiles.map((p) => (
            <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border ${p.is_active ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100 opacity-60"}`}>
              {editingId === p.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" />
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="border rounded px-2 py-1 text-sm">
                    {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                  <button onClick={() => handleSaveEdit(p.id)} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200">Cancel</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${p.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                    <span className="font-medium text-sm">{p.full_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[p.role] || "bg-gray-100 text-gray-700"}`}>{p.role}</span>
                    {!p.is_active && <span className="text-xs text-gray-400">(inactive)</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingId(p.id); setEditName(p.full_name); setEditRole(p.role); }}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">Edit</button>
                    <button onClick={() => handleToggleActive(p.id, p.is_active)}
                      className={`text-xs px-2 py-1 rounded ${p.is_active ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                      {p.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => handleDelete(p.id, p.full_name)}
                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// JOB SITES TAB
// ══════════════════════════════════════════════════════════════════════════

function JobSitesTab() {
  const [sites, setSites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newSite, setNewSite] = useState({ name: "", address: "", client_name: "", notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSite, setEditSite] = useState({ name: "", address: "", client_name: "", notes: "", status: "active" });

  const fetchSites = useCallback(async () => {
    if (isLocal) {
      setSites(getLocalSites());
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("job_sites").select("*").order("status").order("name");
    if (data) setSites(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  async function handleAdd() {
    if (!newSite.name.trim()) return;
    setAdding(true);
    if (isLocal) {
      const all = getLocalSites();
      all.push({
        id: nextId(),
        name: newSite.name.trim(),
        address: newSite.address.trim() || null,
        client_name: newSite.client_name.trim() || null,
        notes: newSite.notes.trim() || null,
        status: "active",
        created_at: new Date().toISOString(),
      });
      saveLocalSites(all);
    } else {
      await supabase.from("job_sites").insert({
        name: newSite.name.trim(),
        address: newSite.address.trim() || null,
        client_name: newSite.client_name.trim() || null,
        notes: newSite.notes.trim() || null,
        status: "active",
      });
    }
    setNewSite({ name: "", address: "", client_name: "", notes: "" });
    setShowAdd(false);
    setAdding(false);
    fetchSites();
  }

  async function handleUpdateStatus(id: string, status: string) {
    if (isLocal) {
      const all = getLocalSites().map(s => s.id === id ? { ...s, status } : s);
      saveLocalSites(all);
    } else {
      await supabase.from("job_sites").update({ status }).eq("id", id);
    }
    fetchSites();
  }

  async function handleSaveEdit(id: string) {
    if (!editSite.name.trim()) return;
    if (isLocal) {
      const all = getLocalSites().map(s => s.id === id ? {
        ...s,
        name: editSite.name.trim(),
        address: editSite.address.trim() || null,
        client_name: editSite.client_name.trim() || null,
        notes: editSite.notes.trim() || null,
        status: editSite.status,
      } : s);
      saveLocalSites(all);
    } else {
      await supabase.from("job_sites").update({
        name: editSite.name.trim(),
        address: editSite.address.trim() || null,
        client_name: editSite.client_name.trim() || null,
        notes: editSite.notes.trim() || null,
        status: editSite.status,
      }).eq("id", id);
    }
    setEditingId(null);
    fetchSites();
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete job site "${name}"?`)) return;
    if (isLocal) {
      saveLocalSites(getLocalSites().filter(s => s.id !== id));
    } else {
      await supabase.from("job_sites").delete().eq("id", id);
    }
    fetchSites();
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading job sites...</div>;

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    on_hold: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">
            Job Sites <span className="text-sm text-gray-400 font-normal ml-2">({sites.filter((s) => s.status === "active").length} active)</span>
          </h3>
          <button onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors">
            + Add Job Site
          </button>
        </div>

        {showAdd && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-green-800 mb-3">New Job Site</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">Site Name *</label>
                <input type="text" value={newSite.name} onChange={(e) => setNewSite({ ...newSite, name: e.target.value })} placeholder="Smith Residence"
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">Client Name</label>
                <input type="text" value={newSite.client_name} onChange={(e) => setNewSite({ ...newSite, client_name: e.target.value })} placeholder="John Smith"
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">Address</label>
                <input type="text" value={newSite.address} onChange={(e) => setNewSite({ ...newSite, address: e.target.value })} placeholder="123 Main St, City, ST"
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">Notes</label>
                <input type="text" value={newSite.notes} onChange={(e) => setNewSite({ ...newSite, notes: e.target.value })} placeholder="Gate code: 1234"
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} disabled={adding || !newSite.name.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700">
                {adding ? "Adding..." : "Add Site"}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">Cancel</button>
            </div>
          </div>
        )}

        {sites.length === 0 ? (
          <p className="text-sm text-gray-400">No job sites yet. Add your first one above.</p>
        ) : (
          <div className="space-y-2">
            {sites.map((site) => (
              <div key={site.id} className={`p-4 rounded-lg border ${site.status === "active" ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"}`}>
                {editingId === site.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input value={editSite.name} onChange={(e) => setEditSite({ ...editSite, name: e.target.value })} placeholder="Site name" className="border rounded px-2 py-1 text-sm" />
                      <input value={editSite.client_name} onChange={(e) => setEditSite({ ...editSite, client_name: e.target.value })} placeholder="Client name" className="border rounded px-2 py-1 text-sm" />
                      <input value={editSite.address} onChange={(e) => setEditSite({ ...editSite, address: e.target.value })} placeholder="Address" className="border rounded px-2 py-1 text-sm" />
                      <input value={editSite.notes} onChange={(e) => setEditSite({ ...editSite, notes: e.target.value })} placeholder="Notes" className="border rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <select value={editSite.status} onChange={(e) => setEditSite({ ...editSite, status: e.target.value })} className="border rounded px-2 py-1 text-sm">
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="on_hold">On Hold</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button onClick={() => handleSaveEdit(site.id)} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{site.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[site.status] || "bg-gray-100 text-gray-700"}`}>
                          {site.status.replace("_", " ")}
                        </span>
                      </div>
                      {site.client_name && <p className="text-xs text-gray-500 mt-0.5">Client: {site.client_name}</p>}
                      {site.address && <p className="text-xs text-gray-500">{site.address}</p>}
                      {site.notes && <p className="text-xs text-gray-400 mt-1">{site.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingId(site.id); setEditSite({ name: site.name, address: site.address || "", client_name: site.client_name || "", notes: site.notes || "", status: site.status }); }}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">Edit</button>
                      {site.status === "active" ? (
                        <button onClick={() => handleUpdateStatus(site.id, "completed")} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Complete</button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(site.id, "active")} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Reactivate</button>
                      )}
                      <button onClick={() => handleDelete(site.id, site.name)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// HOURS SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════

function HoursSettingsTab() {
  const [settings, setSettings] = useState<HoursSettings>({
    default_break_minutes: 30,
    overtime_threshold: 40,
    overtime_rate: 1.5,
    pay_period: "weekly",
    week_start: "sunday",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      if (isLocal) {
        const data = getLocalSettings("hours");
        if (data) setSettings(data as unknown as HoursSettings);
        return;
      }
      const { data } = await supabase.from("app_settings").select("*").eq("key", "hours").single();
      if (data) setSettings(data.value as unknown as HoursSettings);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    if (isLocal) {
      saveLocalSettings("hours", settings as unknown as Record<string, unknown>);
    } else {
      await supabase.from("app_settings").upsert({ key: "hours", value: settings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Pay Clock Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Break (minutes)</label>
              <input type="number" min={0} max={120} value={settings.default_break_minutes}
                onChange={(e) => setSettings({ ...settings, default_break_minutes: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
              <p className="text-xs text-gray-400 mt-1">Auto-applied when clocking out</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overtime Threshold (hrs/week)</label>
              <input type="number" min={0} max={168} value={settings.overtime_threshold}
                onChange={(e) => setSettings({ ...settings, overtime_threshold: parseInt(e.target.value) || 40 })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
              <p className="text-xs text-gray-400 mt-1">Hours before overtime kicks in</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overtime Rate</label>
              <select value={settings.overtime_rate} onChange={(e) => setSettings({ ...settings, overtime_rate: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                <option value={1.5}>1.5x (Time and a half)</option>
                <option value={2}>2x (Double time)</option>
                <option value={1}>1x (No overtime premium)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pay Period</label>
              <select value={settings.pay_period} onChange={(e) => setSettings({ ...settings, pay_period: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-Weekly</option>
                <option value="semimonthly">Semi-Monthly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Week Starts On</label>
              <select value={settings.week_start} onChange={(e) => setSettings({ ...settings, week_start: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
                <option value="saturday">Saturday</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save Pay Clock Settings"}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DISPLAY SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════

function DisplayTab() {
  const [settings, setSettings] = useState<DisplaySettings>({
    time_format: "12h",
    date_format: "MM/DD/YYYY",
    theme: "auto",
    accent_color: "green",
    layout_mode: "mobile",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const localPrefs = loadDisplayPreferences();
      setSettings((prev) => ({ ...prev, ...localPrefs }));

      if (isLocal) {
        applyDisplayPreferences(localPrefs);
        return;
      }

      const { data } = await supabase.from("app_settings").select("*").eq("key", "display").single();
      if (data) {
        const normalized = normalizeDisplayPreferences(data.value as Record<string, unknown>);
        setSettings((prev) => ({ ...prev, ...normalized }));
        saveDisplayPreferences(normalized);
        applyDisplayPreferences(normalized);
      }
    }
    load();
  }, []);

  async function handleSave() {
    saveDisplayPreferences({ theme: settings.theme, layout_mode: settings.layout_mode });
    applyDisplayPreferences({ theme: settings.theme, layout_mode: settings.layout_mode });

    if (isLocal) {
      saveLocalSettings("display", settings as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }

    setSaving(true);
    await supabase.from("app_settings").upsert({ key: "display", value: settings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Display Preferences</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Format</label>
              <select value={settings.time_format} onChange={(e) => setSettings({ ...settings, time_format: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                <option value="12h">12-hour (2:30 PM)</option>
                <option value="24h">24-hour (14:30)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Format</label>
              <select value={settings.date_format} onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
              <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value as ThemePreference })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                <option value="light">Light</option>
                <option value="dark">Dark (battery saver)</option>
                <option value="auto">System Auto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Layout Mode</label>
              <select value={settings.layout_mode} onChange={(e) => setSettings({ ...settings, layout_mode: e.target.value as LayoutPreference })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                <option value="mobile">Mobile First (recommended)</option>
                <option value="desktop">Desktop / Laptop</option>
                <option value="auto">Auto by device</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Accent Color</label>
              <select value={settings.accent_color} onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                <option value="green">Green (Default)</option>
                <option value="blue">Blue</option>
                <option value="orange">Orange</option>
                <option value="purple">Purple</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save Display Settings"}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS TAB
// ══════════════════════════════════════════════════════════════════════════

function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings>({
    clock_reminder: true,
    delivery_alerts: true,
    daily_summary: true,
    reminder_time: "17:00",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      if (isLocal) {
        const data = getLocalSettings("notifications");
        if (data) setSettings(data as unknown as NotificationSettings);
        return;
      }
      const { data } = await supabase.from("app_settings").select("*").eq("key", "notifications").single();
      if (data) setSettings(data.value as unknown as NotificationSettings);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    if (isLocal) {
      saveLocalSettings("notifications", settings as unknown as Record<string, unknown>);
    } else {
      await supabase.from("app_settings").upsert({ key: "notifications", value: settings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Clock-Out Reminder</div>
                <div className="text-xs text-gray-400">Remind crew to clock out at end of day</div>
              </div>
              <input type="checkbox" checked={settings.clock_reminder}
                onChange={(e) => setSettings({ ...settings, clock_reminder: e.target.checked })}
                className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Delivery Alerts</div>
                <div className="text-xs text-gray-400">Get notified when deliveries are logged</div>
              </div>
              <input type="checkbox" checked={settings.delivery_alerts}
                onChange={(e) => setSettings({ ...settings, delivery_alerts: e.target.checked })}
                className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Daily Summary</div>
                <div className="text-xs text-gray-400">Receive a summary of daily activity</div>
              </div>
              <input type="checkbox" checked={settings.daily_summary}
                onChange={(e) => setSettings({ ...settings, daily_summary: e.target.checked })}
                className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
            </label>
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reminder Time</label>
            <input type="time" value={settings.reminder_time}
              onChange={(e) => setSettings({ ...settings, reminder_time: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save Notification Settings"}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// NAF FEED SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════

function NafSettingsTab() {
  const [settings, setSettings] = useState<NafSettings>({
    default_entry_type: "general",
    auto_tag_jobs: true,
    show_weather: true,
    entries_per_page: 50,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      if (isLocal) {
        const data = getLocalSettings("naf");
        if (data) setSettings(data as unknown as NafSettings);
        return;
      }
      const { data } = await supabase.from("app_settings").select("*").eq("key", "naf").single();
      if (data) setSettings(data.value as unknown as NafSettings);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    if (isLocal) {
      saveLocalSettings("naf", settings as unknown as Record<string, unknown>);
    } else {
      await supabase.from("app_settings").upsert({ key: "naf", value: settings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">NAF (Activity Feed) Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Entry Type</label>
              <select value={settings.default_entry_type} onChange={(e) => setSettings({ ...settings, default_entry_type: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                <option value="general">General Note</option>
                <option value="note">Field Note</option>
                <option value="delivery">Delivery</option>
                <option value="photo">Photo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entries Per Page</label>
              <select value={settings.entries_per_page} onChange={(e) => setSettings({ ...settings, entries_per_page: parseInt(e.target.value) })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Auto-Tag Job Sites</div>
                <div className="text-xs text-gray-400">Automatically suggest job sites when posting</div>
              </div>
              <input type="checkbox" checked={settings.auto_tag_jobs}
                onChange={(e) => setSettings({ ...settings, auto_tag_jobs: e.target.checked })}
                className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Show Weather in Feed</div>
                <div className="text-xs text-gray-400">Display weather conditions on field notes</div>
              </div>
              <input type="checkbox" checked={settings.show_weather}
                onChange={(e) => setSettings({ ...settings, show_weather: e.target.checked })}
                className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
            </label>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save Feed Settings"}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DATA & EXPORT TAB
// ══════════════════════════════════════════════════════════════════════════

function DataTab() {
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState("");

  function convertToCSV(data: Record<string, unknown>[]) {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = typeof val === "object" ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(",")
    );
    return [headers.join(","), ...rows].join("\n");
  }

  function downloadCSV(data: Record<string, unknown>[], filename: string) {
    if (data.length === 0) {
      setExportResult(`No data found for ${filename}.`);
      return;
    }
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportResult(`Exported ${data.length} rows.`);
  }

  async function exportData(table: string, filename: string) {
    setExporting(true);
    setExportResult("");
    try {
      if (isLocal) {
        // Export from localStorage
        const keyMap: Record<string, string> = {
          time_entries: "payclock_entries",
          daily_logs: "notepad_logs",
          deliveries: "notepad_deliveries",
          profiles: "jobsite_crew",
          job_sites: "jobsite_sites",
        };
        const lsKey = keyMap[table];
        if (lsKey) {
          const raw = localStorage.getItem(lsKey);
          const data = raw ? JSON.parse(raw) : [];
          downloadCSV(data, filename);
        } else {
          setExportResult(`No local data store for ${table}.`);
        }
      } else {
        const { data, error } = await supabase.from(table).select("*");
        if (error) throw error;
        downloadCSV(data || [], filename);
      }
    } catch (err) {
      setExportResult(`Export failed: ${err}`);
    }
    setExporting(false);
  }

  const exportOptions = [
    { table: "time_entries", label: "Time Entries", icon: "⏱", desc: "All clock in/out records with hours" },
    { table: "daily_logs", label: "Field Notes", icon: "📝", desc: "Daily field notes and work summaries" },
    { table: "deliveries", label: "Deliveries", icon: "📦", desc: "All delivery records and statuses" },
    { table: "profiles", label: "Crew Profiles", icon: "👥", desc: "Crew member profiles and roles" },
    { table: "job_sites", label: "Job Sites", icon: "📍", desc: "Job site records" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Export Data</h3>
        <p className="text-sm text-gray-500 mb-4">Download your data as CSV files for payroll, reporting, or backup.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exportOptions.map((opt) => (
            <button key={opt.table} onClick={() => exportData(opt.table, opt.label.toLowerCase().replace(/\s/g, "_"))}
              disabled={exporting}
              className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left disabled:opacity-50">
              <span className="text-2xl">{opt.icon}</span>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
        {exportResult && <p className="mt-4 text-sm text-green-600">{exportResult}</p>}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Database Info</h3>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>Data is stored {isLocal ? "locally on this device (localStorage)" : "in Supabase (PostgreSQL) with real-time sync"}.</p>
          {!isLocal && <p>Data auto-refreshes every 30 seconds across all pages.</p>}
          {isLocal && <p>Local mode stores all data on this device. Data will be lost if you clear browser storage.</p>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SETTINGS PAGE
// ══════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: "company", label: "Company", icon: "🏢", component: CompanyTab },
  { id: "crew", label: "Crew", icon: "👥", component: CrewTab },
  { id: "jobsites", label: "Job Sites", icon: "📍", component: JobSitesTab },
  { id: "hours", label: "Pay Clock", icon: "⏱", component: HoursSettingsTab },
  { id: "display", label: "Display", icon: "🎨", component: DisplayTab },
  { id: "notifications", label: "Alerts", icon: "🔔", component: NotificationsTab },
  { id: "naf", label: "Feed", icon: "📡", component: NafSettingsTab },
  { id: "data", label: "Data & Export", icon: "📊", component: DataTab },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("company");

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component || CompanyTab;
  const activeTabData = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-5">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure Install Operations for your team</p>
      </div>

      <div className="flex gap-4 min-h-[600px]">
        {/* Sidebar nav */}
        <div className="w-44 flex-shrink-0">
          <nav className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {TABS.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left ${
                  i > 0 ? "border-t border-gray-100" : ""
                } ${
                  activeTab === tab.id
                    ? "bg-green-50 text-green-800 font-semibold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
                {activeTab === tab.id && (
                  <span className="ml-auto text-green-600 text-xs">›</span>
                )}
              </button>
            ))}
          </nav>

          {/* App info */}
          <div className="mt-4 bg-gray-900 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white font-black text-base mx-auto mb-2">IO</div>
            <p className="text-white text-xs font-bold">Install Operations</p>
            <p className="text-gray-500 text-xs mt-0.5">v1.0</p>
          </div>
        </div>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{activeTabData.icon}</span>
            <h2 className="text-lg font-bold text-gray-900">{activeTabData.label}</h2>
          </div>
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
