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
const LS_EMPLOYEES = "jobsite_employees";
const LS_OFFICE_MODE = "office_mode_unlocked";

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

// ── Get current user role from local auth ──
function getCurrentUserRole(): string {
  if (typeof window === "undefined") return "employee";
  try {
    const raw = localStorage.getItem("local_auth_session");
    if (raw) {
      const session = JSON.parse(raw);
      return session.role || "employee";
    }
  } catch {}
  return "employee";
}

function getCurrentUserId(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("local_auth_session");
    if (raw) {
      const session = JSON.parse(raw);
      return session.userId || session.id || "";
    }
  } catch {}
  return "";
}

function isManager(role: string): boolean {
  return ["CreativeEditor", "company_owner", "owner", "field_manager", "foreman"].includes(role);
}

function isAdmin(role: string): boolean {
  return ["CreativeEditor", "company_owner", "owner"].includes(role);
}

// ── Employee Profile Type ──
interface EmployeeProfile {
  id: string;
  full_name: string;
  role: string;
  phone: string;
  email: string;
  hire_date: string;
  pay_rate: number;
  pay_type: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  certifications: string;
  address: string;
  notes: string;
  is_active: boolean;
  created_at: string;
}

function getLocalEmployees(): EmployeeProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_EMPLOYEES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalEmployees(employees: EmployeeProfile[]) {
  localStorage.setItem(LS_EMPLOYEES, JSON.stringify(employees));
}

// ── Types ──
interface CompanySettings {
  name: string;
  phone: string;
  email: string;
  logo_url: string;
  address: string;
  license_number: string;
  insurance_provider: string;
  insurance_policy: string;
}

interface HoursSettings {
  default_break_minutes: number;
  overtime_threshold: number;
  overtime_rate: number;
  pay_period: string;
  week_start: string;
  require_clock_photo: boolean;
  auto_clock_out_hours: number;
  round_to_nearest: number;
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
  weekly_report: boolean;
  new_employee_alert: boolean;
  safety_alerts: boolean;
  weather_alerts: boolean;
}

interface NafSettings {
  default_entry_type: string;
  auto_tag_jobs: boolean;
  show_weather: boolean;
  entries_per_page: number;
}

interface SecuritySettings {
  session_timeout_minutes: number;
  require_pin_on_launch: boolean;
  office_code: string;
  auto_lock_minutes: number;
  login_attempts_before_lock: number;
}

interface SafetySettings {
  require_daily_safety_check: boolean;
  ppe_checklist: boolean;
  incident_reporting: boolean;
  toolbox_talks: boolean;
  safety_meeting_frequency: string;
  osha_tracking: boolean;
}

interface GpsSettings {
  enable_location_tracking: boolean;
  geofence_job_sites: boolean;
  geofence_radius_ft: number;
  track_mileage: boolean;
  require_onsite_clock_in: boolean;
}

interface AutomationSettings {
  auto_daily_report: boolean;
  auto_payroll_export: boolean;
  auto_backup: boolean;
  backup_frequency: string;
  auto_weather_log: boolean;
  auto_overtime_alert: boolean;
}

interface IntegrationSettings {
  quickbooks_enabled: boolean;
  quickbooks_sync_frequency: string;
  google_calendar_sync: boolean;
  email_reports_enabled: boolean;
  email_report_recipients: string;
  webhook_url: string;
}

// ══════════════════════════════════════════════════════════════════════════
// COMPANY SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════

function CompanyTab() {
  const [settings, setSettings] = useState<CompanySettings>({
    name: "Install Operations", phone: "", email: "", logo_url: "",
    address: "", license_number: "", insurance_provider: "", insurance_policy: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      if (isLocal) {
        const data = getLocalSettings("company");
        if (data) setSettings((prev) => ({ ...prev, ...data } as CompanySettings));
        return;
      }
      const { data } = await supabase.from("app_settings").select("*").eq("key", "company").single();
      if (data) setSettings((prev) => ({ ...prev, ...(data.value as Record<string, unknown>) } as CompanySettings));
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    if (isLocal) {
      saveLocalSettings("company", settings as unknown as Record<string, unknown>);
    } else {
      await supabase.from("app_settings").upsert({ key: "company", value: settings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() });
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Address</label>
            <input type="text" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder="123 Main St, City, State ZIP"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contractor License #</label>
              <input type="text" value={settings.license_number} onChange={(e) => setSettings({ ...settings, license_number: e.target.value })}
                placeholder="LIC-12345"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL</label>
              <input type="url" value={settings.logo_url} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Insurance Provider</label>
              <input type="text" value={settings.insurance_provider} onChange={(e) => setSettings({ ...settings, insurance_provider: e.target.value })}
                placeholder="State Farm, Nationwide, etc."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Policy Number</label>
              <input type="text" value={settings.insurance_policy} onChange={(e) => setSettings({ ...settings, insurance_policy: e.target.value })}
                placeholder="POL-ABC-123456"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
            </div>
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
// EMPLOYEES / CREW DIRECTORY TAB (Role-Based Access)
// ══════════════════════════════════════════════════════════════════════════

function EmployeesTab() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const currentRole = getCurrentUserRole();
  const currentUserId = getCurrentUserId();
  const canManage = isManager(currentRole);

  const [newEmployee, setNewEmployee] = useState<Omit<EmployeeProfile, "id" | "created_at">>({
    full_name: "", role: "installer", phone: "", email: "", hire_date: "",
    pay_rate: 0, pay_type: "hourly", emergency_contact_name: "",
    emergency_contact_phone: "", certifications: "", address: "", notes: "", is_active: true,
  });
  const [editEmployee, setEditEmployee] = useState<EmployeeProfile | null>(null);

  const fetchEmployees = useCallback(async () => {
    if (isLocal) {
      let emps = getLocalEmployees();
      // Also merge in any crew members that don't have employee profiles yet
      const crew = getLocalCrew();
      crew.forEach((c) => {
        if (!emps.find((e) => e.id === c.id)) {
          emps.push({
            id: c.id, full_name: c.full_name, role: c.role,
            phone: "", email: "", hire_date: "", pay_rate: 0, pay_type: "hourly",
            emergency_contact_name: "", emergency_contact_phone: "",
            certifications: "", address: "", notes: "", is_active: c.is_active,
            created_at: c.created_at,
          });
        }
      });
      setEmployees(emps);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("profiles").select("*").order("full_name");
    if (data) {
      setEmployees(data.map((p: Profile) => ({
        id: p.id, full_name: p.full_name, role: p.role, phone: "", email: "",
        hire_date: "", pay_rate: 0, pay_type: "hourly", emergency_contact_name: "",
        emergency_contact_phone: "", certifications: "", address: "", notes: "",
        is_active: p.is_active, created_at: p.created_at,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  async function handleAdd() {
    if (!newEmployee.full_name.trim()) return;
    const emp: EmployeeProfile = {
      ...newEmployee, id: nextId(), created_at: new Date().toISOString(),
    };
    const emps = [...getLocalEmployees(), emp];
    saveLocalEmployees(emps);
    // Also add to crew list for compatibility
    const crew = getLocalCrew();
    crew.push({ id: emp.id, full_name: emp.full_name, role: emp.role, is_active: true, created_at: emp.created_at });
    saveLocalCrew(crew);
    setNewEmployee({
      full_name: "", role: "installer", phone: "", email: "", hire_date: "",
      pay_rate: 0, pay_type: "hourly", emergency_contact_name: "",
      emergency_contact_phone: "", certifications: "", address: "", notes: "", is_active: true,
    });
    setShowAdd(false);
    fetchEmployees();
  }

  async function handleSaveEdit() {
    if (!editEmployee) return;
    const emps = getLocalEmployees().map((e) => e.id === editEmployee.id ? editEmployee : e);
    // If not in employee list, add it
    if (!emps.find((e) => e.id === editEmployee.id)) emps.push(editEmployee);
    saveLocalEmployees(emps);
    // Update crew too
    const crew = getLocalCrew().map((c) =>
      c.id === editEmployee.id ? { ...c, full_name: editEmployee.full_name, role: editEmployee.role, is_active: editEmployee.is_active } : c
    );
    saveLocalCrew(crew);
    setEditingId(null);
    setEditEmployee(null);
    fetchEmployees();
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete employee "${name}"? This cannot be undone.`)) return;
    saveLocalEmployees(getLocalEmployees().filter((e) => e.id !== id));
    saveLocalCrew(getLocalCrew().filter((c) => c.id !== id));
    fetchEmployees();
  }

  async function handleToggleActive(emp: EmployeeProfile) {
    const updated = { ...emp, is_active: !emp.is_active };
    const emps = getLocalEmployees().map((e) => e.id === emp.id ? updated : e);
    if (!emps.find((e) => e.id === emp.id)) emps.push(updated);
    saveLocalEmployees(emps);
    const crew = getLocalCrew().map((c) => c.id === emp.id ? { ...c, is_active: !emp.is_active } : c);
    saveLocalCrew(crew);
    fetchEmployees();
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading employees...</div>;

  const ROLES = ["owner", "foreman", "installer", "laborer"];
  const ROLE_COLORS: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700", foreman: "bg-blue-100 text-blue-700",
    installer: "bg-green-100 text-green-700", laborer: "bg-gray-100 text-gray-700",
    CreativeEditor: "bg-red-100 text-red-700", company_owner: "bg-purple-100 text-purple-700",
    field_manager: "bg-blue-100 text-blue-700",
  };

  const filtered = employees.filter((e) => {
    const matchesSearch = e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.phone.includes(searchQuery);
    const matchesRole = filterRole === "all" || e.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white";
  const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className={inputClass} />
          </div>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={`${inputClass} sm:w-40`}>
            <option value="all">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          {canManage && (
            <button onClick={() => setShowAdd(!showAdd)}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors whitespace-nowrap">
              + Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Add Employee Form (Managers Only) */}
      {showAdd && canManage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
          <h4 className="font-semibold text-green-800 dark:text-green-300 mb-4 text-base">New Employee Profile</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className={labelClass}>Full Name *</label>
              <input type="text" value={newEmployee.full_name} onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                placeholder="John Smith" className={inputClass} /></div>
            <div><label className={labelClass}>Role</label>
              <select value={newEmployee.role} onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })} className={inputClass}>
                {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select></div>
            <div><label className={labelClass}>Phone</label>
              <input type="tel" value={newEmployee.phone} onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                placeholder="(555) 123-4567" className={inputClass} /></div>
            <div><label className={labelClass}>Email</label>
              <input type="email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                placeholder="john@example.com" className={inputClass} /></div>
            <div><label className={labelClass}>Hire Date</label>
              <input type="date" value={newEmployee.hire_date} onChange={(e) => setNewEmployee({ ...newEmployee, hire_date: e.target.value })}
                className={inputClass} /></div>
            <div><label className={labelClass}>Pay Rate ($)</label>
              <div className="flex gap-2">
                <input type="number" min={0} step={0.5} value={newEmployee.pay_rate || ""} onChange={(e) => setNewEmployee({ ...newEmployee, pay_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="25.00" className={`${inputClass} flex-1`} />
                <select value={newEmployee.pay_type} onChange={(e) => setNewEmployee({ ...newEmployee, pay_type: e.target.value })} className={`${inputClass} w-24`}>
                  <option value="hourly">/ hr</option>
                  <option value="salary">Salary</option>
                </select>
              </div></div>
            <div><label className={labelClass}>Home Address</label>
              <input type="text" value={newEmployee.address} onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                placeholder="123 Main St, City, ST" className={inputClass} /></div>
            <div><label className={labelClass}>Emergency Contact Name</label>
              <input type="text" value={newEmployee.emergency_contact_name} onChange={(e) => setNewEmployee({ ...newEmployee, emergency_contact_name: e.target.value })}
                placeholder="Jane Smith" className={inputClass} /></div>
            <div><label className={labelClass}>Emergency Contact Phone</label>
              <input type="tel" value={newEmployee.emergency_contact_phone} onChange={(e) => setNewEmployee({ ...newEmployee, emergency_contact_phone: e.target.value })}
                placeholder="(555) 987-6543" className={inputClass} /></div>
            <div className="sm:col-span-2 lg:col-span-3"><label className={labelClass}>Certifications / Skills</label>
              <input type="text" value={newEmployee.certifications} onChange={(e) => setNewEmployee({ ...newEmployee, certifications: e.target.value })}
                placeholder="OSHA 10, Forklift Certified, CPR, First Aid..." className={inputClass} /></div>
            <div className="sm:col-span-2 lg:col-span-3"><label className={labelClass}>Notes</label>
              <textarea value={newEmployee.notes} onChange={(e) => setNewEmployee({ ...newEmployee, notes: e.target.value })}
                placeholder="Additional notes about this employee..." rows={2} className={inputClass} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} disabled={!newEmployee.full_name.trim()}
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700">
              Add Employee
            </button>
            <button onClick={() => setShowAdd(false)} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {/* Employee Count */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-gray-500">
          {filtered.length} employee{filtered.length !== 1 ? "s" : ""} {filterRole !== "all" ? `(${filterRole})` : ""} · {employees.filter((e) => e.is_active).length} active
        </span>
        {!canManage && (
          <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">Employee View - Contact info only for others</span>
        )}
      </div>

      {/* Employee Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 text-sm">
            {searchQuery || filterRole !== "all" ? "No employees match your search." : "No employees yet. Add your first one above."}
          </div>
        )}
        {filtered.map((emp) => {
          const isOwnProfile = emp.id === currentUserId;
          const canSeeFullDetails = canManage || isOwnProfile;
          const isExpanded = expandedId === emp.id;
          const isEditing = editingId === emp.id;

          return (
            <div key={emp.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all ${
              emp.is_active ? "border-gray-200 dark:border-gray-700" : "border-gray-100 dark:border-gray-800 opacity-60"
            } ${isExpanded ? "ring-2 ring-green-200" : ""}`}>
              {/* Header Row */}
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : emp.id)}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    emp.is_active ? "bg-green-600" : "bg-gray-400"
                  }`}>
                    {emp.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{emp.full_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[emp.role] || "bg-gray-100 text-gray-700"}`}>
                        {emp.role}
                      </span>
                      {isOwnProfile && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">You</span>}
                      {!emp.is_active && <span className="text-xs text-gray-400">(inactive)</span>}
                    </div>
                    {/* Always show basic contact info */}
                    <div className="flex gap-3 mt-0.5">
                      {emp.phone && <span className="text-xs text-gray-500">{emp.phone}</span>}
                      {emp.email && <span className="text-xs text-gray-500">{emp.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(emp.id); setEditEmployee({ ...emp }); }}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); handleToggleActive(emp); }}
                        className={`text-xs px-2 py-1 rounded ${emp.is_active ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                        {emp.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(emp.id, emp.full_name); }}
                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Delete</button>
                    </>
                  )}
                  <span className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && !isEditing && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4 pt-3">
                  {canSeeFullDetails ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div><span className="text-xs font-medium text-gray-400 block">Phone</span><span className="text-gray-700 dark:text-gray-300">{emp.phone || "—"}</span></div>
                      <div><span className="text-xs font-medium text-gray-400 block">Email</span><span className="text-gray-700 dark:text-gray-300">{emp.email || "—"}</span></div>
                      <div><span className="text-xs font-medium text-gray-400 block">Role</span><span className="text-gray-700 dark:text-gray-300">{emp.role}</span></div>
                      <div><span className="text-xs font-medium text-gray-400 block">Hire Date</span><span className="text-gray-700 dark:text-gray-300">{emp.hire_date || "—"}</span></div>
                      {canManage && <div><span className="text-xs font-medium text-gray-400 block">Pay Rate</span><span className="text-gray-700 dark:text-gray-300">{emp.pay_rate ? `$${emp.pay_rate}/${emp.pay_type === "salary" ? "yr" : "hr"}` : "—"}</span></div>}
                      <div><span className="text-xs font-medium text-gray-400 block">Status</span><span className={emp.is_active ? "text-green-600" : "text-gray-400"}>{emp.is_active ? "Active" : "Inactive"}</span></div>
                      {canManage && <div><span className="text-xs font-medium text-gray-400 block">Address</span><span className="text-gray-700 dark:text-gray-300">{emp.address || "—"}</span></div>}
                      <div><span className="text-xs font-medium text-gray-400 block">Emergency Contact</span><span className="text-gray-700 dark:text-gray-300">{emp.emergency_contact_name ? `${emp.emergency_contact_name} - ${emp.emergency_contact_phone}` : "—"}</span></div>
                      <div className="sm:col-span-2 lg:col-span-3"><span className="text-xs font-medium text-gray-400 block">Certifications</span><span className="text-gray-700 dark:text-gray-300">{emp.certifications || "—"}</span></div>
                      {canManage && emp.notes && <div className="sm:col-span-2 lg:col-span-3"><span className="text-xs font-medium text-gray-400 block">Notes</span><span className="text-gray-700 dark:text-gray-300">{emp.notes}</span></div>}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div><span className="text-xs font-medium text-gray-400 block">Phone</span><span className="text-gray-700 dark:text-gray-300">{emp.phone || "—"}</span></div>
                      <div><span className="text-xs font-medium text-gray-400 block">Email</span><span className="text-gray-700 dark:text-gray-300">{emp.email || "—"}</span></div>
                      <div><span className="text-xs font-medium text-gray-400 block">Role</span><span className="text-gray-700 dark:text-gray-300">{emp.role}</span></div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit Form (Managers Only) */}
              {isEditing && editEmployee && canManage && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div><label className={labelClass}>Full Name</label>
                      <input type="text" value={editEmployee.full_name} onChange={(e) => setEditEmployee({ ...editEmployee, full_name: e.target.value })} className={inputClass} /></div>
                    <div><label className={labelClass}>Role</label>
                      <select value={editEmployee.role} onChange={(e) => setEditEmployee({ ...editEmployee, role: e.target.value })} className={inputClass}>
                        {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                      </select></div>
                    <div><label className={labelClass}>Phone</label>
                      <input type="tel" value={editEmployee.phone} onChange={(e) => setEditEmployee({ ...editEmployee, phone: e.target.value })} className={inputClass} /></div>
                    <div><label className={labelClass}>Email</label>
                      <input type="email" value={editEmployee.email} onChange={(e) => setEditEmployee({ ...editEmployee, email: e.target.value })} className={inputClass} /></div>
                    <div><label className={labelClass}>Hire Date</label>
                      <input type="date" value={editEmployee.hire_date} onChange={(e) => setEditEmployee({ ...editEmployee, hire_date: e.target.value })} className={inputClass} /></div>
                    <div><label className={labelClass}>Pay Rate ($)</label>
                      <div className="flex gap-2">
                        <input type="number" min={0} step={0.5} value={editEmployee.pay_rate || ""} onChange={(e) => setEditEmployee({ ...editEmployee, pay_rate: parseFloat(e.target.value) || 0 })} className={`${inputClass} flex-1`} />
                        <select value={editEmployee.pay_type} onChange={(e) => setEditEmployee({ ...editEmployee, pay_type: e.target.value })} className={`${inputClass} w-24`}>
                          <option value="hourly">/ hr</option><option value="salary">Salary</option>
                        </select>
                      </div></div>
                    <div><label className={labelClass}>Address</label>
                      <input type="text" value={editEmployee.address} onChange={(e) => setEditEmployee({ ...editEmployee, address: e.target.value })} className={inputClass} /></div>
                    <div><label className={labelClass}>Emergency Contact</label>
                      <input type="text" value={editEmployee.emergency_contact_name} onChange={(e) => setEditEmployee({ ...editEmployee, emergency_contact_name: e.target.value })} className={inputClass} /></div>
                    <div><label className={labelClass}>Emergency Phone</label>
                      <input type="tel" value={editEmployee.emergency_contact_phone} onChange={(e) => setEditEmployee({ ...editEmployee, emergency_contact_phone: e.target.value })} className={inputClass} /></div>
                    <div className="sm:col-span-2 lg:col-span-3"><label className={labelClass}>Certifications</label>
                      <input type="text" value={editEmployee.certifications} onChange={(e) => setEditEmployee({ ...editEmployee, certifications: e.target.value })} className={inputClass} /></div>
                    <div className="sm:col-span-2 lg:col-span-3"><label className={labelClass}>Notes</label>
                      <textarea value={editEmployee.notes} onChange={(e) => setEditEmployee({ ...editEmployee, notes: e.target.value })} rows={2} className={inputClass} /></div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleSaveEdit} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Save</button>
                    <button onClick={() => { setEditingId(null); setEditEmployee(null); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
    if (isLocal) { setSites(getLocalSites()); setLoading(false); return; }
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
      all.push({ id: nextId(), name: newSite.name.trim(), address: newSite.address.trim() || null, client_name: newSite.client_name.trim() || null, notes: newSite.notes.trim() || null, status: "active", created_at: new Date().toISOString() });
      saveLocalSites(all);
    } else {
      await supabase.from("job_sites").insert({ name: newSite.name.trim(), address: newSite.address.trim() || null, client_name: newSite.client_name.trim() || null, notes: newSite.notes.trim() || null, status: "active" });
    }
    setNewSite({ name: "", address: "", client_name: "", notes: "" });
    setShowAdd(false); setAdding(false); fetchSites();
  }

  async function handleUpdateStatus(id: string, status: string) {
    if (isLocal) { saveLocalSites(getLocalSites().map(s => s.id === id ? { ...s, status } : s)); } else { await supabase.from("job_sites").update({ status }).eq("id", id); }
    fetchSites();
  }

  async function handleSaveEdit(id: string) {
    if (!editSite.name.trim()) return;
    if (isLocal) {
      saveLocalSites(getLocalSites().map(s => s.id === id ? { ...s, name: editSite.name.trim(), address: editSite.address.trim() || null, client_name: editSite.client_name.trim() || null, notes: editSite.notes.trim() || null, status: editSite.status } : s));
    } else {
      await supabase.from("job_sites").update({ name: editSite.name.trim(), address: editSite.address.trim() || null, client_name: editSite.client_name.trim() || null, notes: editSite.notes.trim() || null, status: editSite.status }).eq("id", id);
    }
    setEditingId(null); fetchSites();
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete job site "${name}"?`)) return;
    if (isLocal) { saveLocalSites(getLocalSites().filter(s => s.id !== id)); } else { await supabase.from("job_sites").delete().eq("id", id); }
    fetchSites();
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading job sites...</div>;

  const STATUS_COLORS: Record<string, string> = { active: "bg-green-100 text-green-700", completed: "bg-blue-100 text-blue-700", on_hold: "bg-amber-100 text-amber-700", cancelled: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Job Sites <span className="text-sm text-gray-400 font-normal ml-2">({sites.filter(s => s.status === "active").length} active)</span></h3>
          <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors">+ Add Job Site</button>
        </div>
        {showAdd && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-green-800 mb-3">New Job Site</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-green-700 mb-1">Site Name *</label>
                <input type="text" value={newSite.name} onChange={(e) => setNewSite({ ...newSite, name: e.target.value })} placeholder="Smith Residence" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-green-700 mb-1">Client Name</label>
                <input type="text" value={newSite.client_name} onChange={(e) => setNewSite({ ...newSite, client_name: e.target.value })} placeholder="John Smith" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-green-700 mb-1">Address</label>
                <input type="text" value={newSite.address} onChange={(e) => setNewSite({ ...newSite, address: e.target.value })} placeholder="123 Main St, City, ST" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-green-700 mb-1">Notes</label>
                <input type="text" value={newSite.notes} onChange={(e) => setNewSite({ ...newSite, notes: e.target.value })} placeholder="Gate code: 1234" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} disabled={adding || !newSite.name.trim()} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700">{adding ? "Adding..." : "Add Site"}</button>
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
                        <option value="active">Active</option><option value="completed">Completed</option><option value="on_hold">On Hold</option><option value="cancelled">Cancelled</option>
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
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[site.status] || "bg-gray-100 text-gray-700"}`}>{site.status.replace("_", " ")}</span>
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
// PAY CLOCK SETTINGS TAB (Enhanced)
// ══════════════════════════════════════════════════════════════════════════

function HoursSettingsTab() {
  const [settings, setSettings] = useState<HoursSettings>({
    default_break_minutes: 30, overtime_threshold: 40, overtime_rate: 1.5,
    pay_period: "weekly", week_start: "sunday", require_clock_photo: false,
    auto_clock_out_hours: 12, round_to_nearest: 15,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      if (isLocal) { const data = getLocalSettings("hours"); if (data) setSettings((prev) => ({ ...prev, ...data } as HoursSettings)); return; }
      const { data } = await supabase.from("app_settings").select("*").eq("key", "hours").single();
      if (data) setSettings((prev) => ({ ...prev, ...(data.value as Record<string, unknown>) } as HoursSettings));
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    if (isLocal) { saveLocalSettings("hours", settings as unknown as Record<string, unknown>); }
    else { await supabase.from("app_settings").upsert({ key: "hours", value: settings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() }); }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white";

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Pay Clock Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Break (minutes)</label>
              <input type="number" min={0} max={120} value={settings.default_break_minutes}
                onChange={(e) => setSettings({ ...settings, default_break_minutes: parseInt(e.target.value) || 0 })} className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">Auto-applied when clocking out</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overtime Threshold (hrs/week)</label>
              <input type="number" min={0} max={168} value={settings.overtime_threshold}
                onChange={(e) => setSettings({ ...settings, overtime_threshold: parseInt(e.target.value) || 40 })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overtime Rate</label>
              <select value={settings.overtime_rate} onChange={(e) => setSettings({ ...settings, overtime_rate: parseFloat(e.target.value) })} className={inputClass}>
                <option value={1.5}>1.5x (Time and a half)</option><option value={2}>2x (Double time)</option><option value={1}>1x (No overtime premium)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pay Period</label>
              <select value={settings.pay_period} onChange={(e) => setSettings({ ...settings, pay_period: e.target.value })} className={inputClass}>
                <option value="weekly">Weekly</option><option value="biweekly">Bi-Weekly</option><option value="semimonthly">Semi-Monthly</option><option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Week Starts On</label>
              <select value={settings.week_start} onChange={(e) => setSettings({ ...settings, week_start: e.target.value })} className={inputClass}>
                <option value="sunday">Sunday</option><option value="monday">Monday</option><option value="saturday">Saturday</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Round Time To Nearest (min)</label>
              <select value={settings.round_to_nearest} onChange={(e) => setSettings({ ...settings, round_to_nearest: parseInt(e.target.value) })} className={inputClass}>
                <option value={1}>1 minute (exact)</option><option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auto Clock-Out After (hours)</label>
              <input type="number" min={1} max={24} value={settings.auto_clock_out_hours}
                onChange={(e) => setSettings({ ...settings, auto_clock_out_hours: parseInt(e.target.value) || 12 })} className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">Safety net if someone forgets to clock out</p>
            </div>
          </div>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Require Photo on Clock-In</div>
              <div className="text-xs text-gray-400">Employees must take a photo when clocking in</div>
            </div>
            <input type="checkbox" checked={settings.require_clock_photo}
              onChange={(e) => setSettings({ ...settings, require_clock_photo: e.target.checked })}
              className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
          </label>
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
    time_format: "12h", date_format: "MM/DD/YYYY", theme: "auto", accent_color: "green", layout_mode: "mobile",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const localPrefs = loadDisplayPreferences();
      setSettings((prev) => ({ ...prev, ...localPrefs }));
      if (isLocal) { applyDisplayPreferences(localPrefs); return; }
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
    if (isLocal) { saveLocalSettings("display", settings as unknown as Record<string, unknown>); setSaved(true); setTimeout(() => setSaved(false), 2000); return; }
    setSaving(true);
    await supabase.from("app_settings").upsert({ key: "display", value: settings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white";

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Display Preferences</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Format</label>
              <select value={settings.time_format} onChange={(e) => setSettings({ ...settings, time_format: e.target.value })} className={inputClass}>
                <option value="12h">12-hour (2:30 PM)</option><option value="24h">24-hour (14:30)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Format</label>
              <select value={settings.date_format} onChange={(e) => setSettings({ ...settings, date_format: e.target.value })} className={inputClass}>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
              <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value as ThemePreference })} className={inputClass}>
                <option value="light">Light</option><option value="dark">Dark (battery saver)</option><option value="auto">System Auto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Layout Mode</label>
              <select value={settings.layout_mode} onChange={(e) => setSettings({ ...settings, layout_mode: e.target.value as LayoutPreference })} className={inputClass}>
                <option value="mobile">Mobile First (recommended)</option><option value="desktop">Desktop / Laptop</option><option value="auto">Auto by device</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Accent Color</label>
              <select value={settings.accent_color} onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })} className={inputClass}>
                <option value="green">Green (Default)</option><option value="blue">Blue</option><option value="orange">Orange</option><option value="purple">Purple</option>
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
// NOTIFICATIONS TAB (Enhanced)
// ══════════════════════════════════════════════════════════════════════════

function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings>({
    clock_reminder: true, delivery_alerts: true, daily_summary: true, reminder_time: "17:00",
    weekly_report: false, new_employee_alert: true, safety_alerts: true, weather_alerts: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      if (isLocal) { const data = getLocalSettings("notifications"); if (data) setSettings((prev) => ({ ...prev, ...data } as NotificationSettings)); return; }
      const { data } = await supabase.from("app_settings").select("*").eq("key", "notifications").single();
      if (data) setSettings((prev) => ({ ...prev, ...(data.value as Record<string, unknown>) } as NotificationSettings));
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    if (isLocal) { saveLocalSettings("notifications", settings as unknown as Record<string, unknown>); }
    else { await supabase.from("app_settings").upsert({ key: "notifications", value: settings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() }); }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const toggles: { key: keyof NotificationSettings; label: string; desc: string }[] = [
    { key: "clock_reminder", label: "Clock-Out Reminder", desc: "Remind crew to clock out at end of day" },
    { key: "delivery_alerts", label: "Delivery Alerts", desc: "Get notified when deliveries are logged" },
    { key: "daily_summary", label: "Daily Summary", desc: "Receive a summary of daily activity" },
    { key: "weekly_report", label: "Weekly Report", desc: "Get a weekly overview email every Monday" },
    { key: "new_employee_alert", label: "New Employee Alerts", desc: "Notify when new crew members are added" },
    { key: "safety_alerts", label: "Safety Alerts", desc: "Critical safety and incident notifications" },
    { key: "weather_alerts", label: "Weather Alerts", desc: "Severe weather warnings for job site areas" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          {toggles.map((t) => (
            <label key={t.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{t.label}</div>
                <div className="text-xs text-gray-400">{t.desc}</div>
              </div>
              <input type="checkbox" checked={settings[t.key] as boolean}
                onChange={(e) => setSettings({ ...settings, [t.key]: e.target.checked })}
                className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
            </label>
          ))}
          <div className="w-48 pt-2">
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
  const [settings, setSettings] = useState<NafSettings>({ default_entry_type: "general", auto_tag_jobs: true, show_weather: true, entries_per_page: 50 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      if (isLocal) { const data = getLocalSettings("naf"); if (data) setSettings(data as unknown as NafSettings); return; }
      const { data } = await supabase.from("app_settings").select("*").eq("key", "naf").single();
      if (data) setSettings(data.value as unknown as NafSettings);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    if (isLocal) { saveLocalSettings("naf", settings as unknown as Record<string, unknown>); }
    else { await supabase.from("app_settings").upsert({ key: "naf", value: settings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() }); }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white";

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">NAF (Activity Feed) Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Entry Type</label>
              <select value={settings.default_entry_type} onChange={(e) => setSettings({ ...settings, default_entry_type: e.target.value })} className={inputClass}>
                <option value="general">General Note</option><option value="note">Field Note</option><option value="delivery">Delivery</option><option value="photo">Photo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entries Per Page</label>
              <select value={settings.entries_per_page} onChange={(e) => setSettings({ ...settings, entries_per_page: parseInt(e.target.value) })} className={inputClass}>
                <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value={200}>200</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
              <div><div className="text-sm font-medium text-gray-700 dark:text-gray-200">Auto-Tag Job Sites</div><div className="text-xs text-gray-400">Automatically suggest job sites when posting</div></div>
              <input type="checkbox" checked={settings.auto_tag_jobs} onChange={(e) => setSettings({ ...settings, auto_tag_jobs: e.target.checked })} className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
              <div><div className="text-sm font-medium text-gray-700 dark:text-gray-200">Show Weather in Feed</div><div className="text-xs text-gray-400">Display weather conditions on field notes</div></div>
              <input type="checkbox" checked={settings.show_weather} onChange={(e) => setSettings({ ...settings, show_weather: e.target.checked })} className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
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
    const rows = data.map((row) => headers.map((h) => { const val = row[h]; if (val === null || val === undefined) return ""; const str = typeof val === "object" ? JSON.stringify(val) : String(val); return `"${str.replace(/"/g, '""')}"`; }).join(","));
    return [headers.join(","), ...rows].join("\n");
  }

  function downloadCSV(data: Record<string, unknown>[], filename: string) {
    if (data.length === 0) { setExportResult(`No data found for ${filename}.`); return; }
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportResult(`Exported ${data.length} rows.`);
  }

  async function exportData(table: string, filename: string) {
    setExporting(true); setExportResult("");
    try {
      if (isLocal) {
        const keyMap: Record<string, string> = { time_entries: "payclock_entries", daily_logs: "notepad_logs", deliveries: "notepad_deliveries", profiles: "jobsite_crew", job_sites: "jobsite_sites", employees: "jobsite_employees" };
        const lsKey = keyMap[table];
        if (lsKey) { const raw = localStorage.getItem(lsKey); downloadCSV(raw ? JSON.parse(raw) : [], filename); }
        else { setExportResult(`No local data store for ${table}.`); }
      } else {
        const { data, error } = await supabase.from(table).select("*");
        if (error) throw error;
        downloadCSV(data || [], filename);
      }
    } catch (err) { setExportResult(`Export failed: ${err}`); }
    setExporting(false);
  }

  const exportOptions = [
    { table: "time_entries", label: "Time Entries", icon: "clock", desc: "All clock in/out records with hours" },
    { table: "daily_logs", label: "Field Notes", icon: "note", desc: "Daily field notes and work summaries" },
    { table: "deliveries", label: "Deliveries", icon: "truck", desc: "All delivery records and statuses" },
    { table: "profiles", label: "Crew Profiles", icon: "users", desc: "Crew member profiles and roles" },
    { table: "job_sites", label: "Job Sites", icon: "map", desc: "Job site records" },
    { table: "employees", label: "Employee Profiles", icon: "id", desc: "Full employee profile data" },
  ];

  const ICONS: Record<string, string> = { clock: "⏱", note: "📝", truck: "📦", users: "👥", map: "📍", id: "🪪" };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Export Data</h3>
        <p className="text-sm text-gray-500 mb-4">Download your data as CSV files for payroll, reporting, or backup.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exportOptions.map((opt) => (
            <button key={opt.table} onClick={() => exportData(opt.table, opt.label.toLowerCase().replace(/\s/g, "_"))} disabled={exporting}
              className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left disabled:opacity-50">
              <span className="text-2xl">{ICONS[opt.icon]}</span>
              <div><div className="text-sm font-medium text-gray-700 dark:text-gray-200">{opt.label}</div><div className="text-xs text-gray-400">{opt.desc}</div></div>
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
// OFFICE-ONLY TABS (Hidden behind OFFICE toggle)
// ══════════════════════════════════════════════════════════════════════════

function SettingsToggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
      <div><div className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</div><div className="text-xs text-gray-400">{desc}</div></div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
    </label>
  );
}

function SecurityTab() {
  const [settings, setSettings] = useState<SecuritySettings>({
    session_timeout_minutes: 480, require_pin_on_launch: false, office_code: "OFFICE",
    auto_lock_minutes: 30, login_attempts_before_lock: 5,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    const data = getLocalSettings("security");
    if (data) setSettings((prev) => ({ ...prev, ...data } as SecuritySettings));
  }, []);

  function handleSave() {
    setSaving(true);
    saveLocalSettings("security", settings as unknown as Record<string, unknown>);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white";

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Security & Access</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session Timeout (minutes)</label>
              <input type="number" min={5} max={1440} value={settings.session_timeout_minutes}
                onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 480 })} className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">Auto-logout after inactivity</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auto-Lock Screen (minutes)</label>
              <input type="number" min={1} max={120} value={settings.auto_lock_minutes}
                onChange={(e) => setSettings({ ...settings, auto_lock_minutes: parseInt(e.target.value) || 30 })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Login Attempts</label>
              <input type="number" min={1} max={20} value={settings.login_attempts_before_lock}
                onChange={(e) => setSettings({ ...settings, login_attempts_before_lock: parseInt(e.target.value) || 5 })} className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">Lock account after failed attempts</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Office Mode Code</label>
              <div className="flex gap-2">
                <input type={showCode ? "text" : "password"} value={settings.office_code}
                  onChange={(e) => setSettings({ ...settings, office_code: e.target.value })} className={`${inputClass} flex-1`} />
                <button onClick={() => setShowCode(!showCode)} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
                  {showCode ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Code to unlock Office Mode in settings</p>
            </div>
          </div>
          <SettingsToggle label="Require PIN on App Launch" desc="Ask for PIN every time the app is opened" checked={settings.require_pin_on_launch} onChange={(v) => setSettings({ ...settings, require_pin_on_launch: v })} />
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save Security Settings"}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SafetyTab() {
  const [settings, setSettings] = useState<SafetySettings>({
    require_daily_safety_check: false, ppe_checklist: false, incident_reporting: true,
    toolbox_talks: false, safety_meeting_frequency: "weekly", osha_tracking: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { const data = getLocalSettings("safety"); if (data) setSettings((prev) => ({ ...prev, ...data } as SafetySettings)); }, []);

  function handleSave() {
    setSaving(true); saveLocalSettings("safety", settings as unknown as Record<string, unknown>);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Safety & Compliance</h3>
        <div className="space-y-3">
          <SettingsToggle label="Daily Safety Check-In" desc="Require crew to complete a safety checklist before starting work" checked={settings.require_daily_safety_check} onChange={(v) => setSettings({ ...settings, require_daily_safety_check: v })} />
          <SettingsToggle label="PPE Checklist" desc="Track personal protective equipment compliance" checked={settings.ppe_checklist} onChange={(v) => setSettings({ ...settings, ppe_checklist: v })} />
          <SettingsToggle label="Incident Reporting" desc="Enable on-site incident and near-miss reporting" checked={settings.incident_reporting} onChange={(v) => setSettings({ ...settings, incident_reporting: v })} />
          <SettingsToggle label="Toolbox Talks" desc="Schedule and track toolbox safety talks" checked={settings.toolbox_talks} onChange={(v) => setSettings({ ...settings, toolbox_talks: v })} />
          <SettingsToggle label="OSHA Tracking" desc="Track OSHA compliance hours and certifications" checked={settings.osha_tracking} onChange={(v) => setSettings({ ...settings, osha_tracking: v })} />
          <div className="w-64 pt-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Safety Meeting Frequency</label>
            <select value={settings.safety_meeting_frequency} onChange={(e) => setSettings({ ...settings, safety_meeting_frequency: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="biweekly">Bi-Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save Safety Settings"}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function GpsTab() {
  const [settings, setSettings] = useState<GpsSettings>({
    enable_location_tracking: false, geofence_job_sites: false, geofence_radius_ft: 500,
    track_mileage: false, require_onsite_clock_in: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { const data = getLocalSettings("gps"); if (data) setSettings((prev) => ({ ...prev, ...data } as GpsSettings)); }, []);

  function handleSave() {
    setSaving(true); saveLocalSettings("gps", settings as unknown as Record<string, unknown>);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">GPS & Location</h3>
        <div className="space-y-3">
          <SettingsToggle label="Location Tracking" desc="Track crew location during work hours" checked={settings.enable_location_tracking} onChange={(v) => setSettings({ ...settings, enable_location_tracking: v })} />
          <SettingsToggle label="Geofence Job Sites" desc="Set virtual boundaries around job sites" checked={settings.geofence_job_sites} onChange={(v) => setSettings({ ...settings, geofence_job_sites: v })} />
          {settings.geofence_job_sites && (
            <div className="w-64 pl-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Geofence Radius (feet)</label>
              <input type="number" min={50} max={5000} value={settings.geofence_radius_ft}
                onChange={(e) => setSettings({ ...settings, geofence_radius_ft: parseInt(e.target.value) || 500 })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" />
            </div>
          )}
          <SettingsToggle label="Track Mileage" desc="Log miles driven between job sites" checked={settings.track_mileage} onChange={(v) => setSettings({ ...settings, track_mileage: v })} />
          <SettingsToggle label="Require On-Site Clock-In" desc="Only allow clock-in within geofence of assigned site" checked={settings.require_onsite_clock_in} onChange={(v) => setSettings({ ...settings, require_onsite_clock_in: v })} />
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save GPS Settings"}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AutomationTab() {
  const [settings, setSettings] = useState<AutomationSettings>({
    auto_daily_report: false, auto_payroll_export: false, auto_backup: true,
    backup_frequency: "daily", auto_weather_log: false, auto_overtime_alert: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { const data = getLocalSettings("automation"); if (data) setSettings((prev) => ({ ...prev, ...data } as AutomationSettings)); }, []);

  function handleSave() {
    setSaving(true); saveLocalSettings("automation", settings as unknown as Record<string, unknown>);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Automation & Workflows</h3>
        <div className="space-y-3">
          <SettingsToggle label="Auto Daily Report" desc="Generate and send daily work reports automatically" checked={settings.auto_daily_report} onChange={(v) => setSettings({ ...settings, auto_daily_report: v })} />
          <SettingsToggle label="Auto Payroll Export" desc="Automatically export payroll data at end of pay period" checked={settings.auto_payroll_export} onChange={(v) => setSettings({ ...settings, auto_payroll_export: v })} />
          <SettingsToggle label="Auto Overtime Alert" desc="Alert managers when employees approach overtime threshold" checked={settings.auto_overtime_alert} onChange={(v) => setSettings({ ...settings, auto_overtime_alert: v })} />
          <SettingsToggle label="Auto Weather Logging" desc="Automatically log weather conditions at job sites" checked={settings.auto_weather_log} onChange={(v) => setSettings({ ...settings, auto_weather_log: v })} />
          <SettingsToggle label="Auto Backup" desc="Automatically backup data on a schedule" checked={settings.auto_backup} onChange={(v) => setSettings({ ...settings, auto_backup: v })} />
          {settings.auto_backup && (
            <div className="w-64 pl-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Backup Frequency</label>
              <select value={settings.backup_frequency} onChange={(e) => setSettings({ ...settings, backup_frequency: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                <option value="hourly">Hourly</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
              </select>
            </div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save Automation Settings"}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const [settings, setSettings] = useState<IntegrationSettings>({
    quickbooks_enabled: false, quickbooks_sync_frequency: "daily", google_calendar_sync: false,
    email_reports_enabled: false, email_report_recipients: "", webhook_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { const data = getLocalSettings("integrations"); if (data) setSettings((prev) => ({ ...prev, ...data } as IntegrationSettings)); }, []);

  function handleSave() {
    setSaving(true); saveLocalSettings("integrations", settings as unknown as Record<string, unknown>);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white";

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Integrations</h3>
        <div className="space-y-3">
          <SettingsToggle label="QuickBooks Integration" desc="Sync time entries and payroll with QuickBooks" checked={settings.quickbooks_enabled} onChange={(v) => setSettings({ ...settings, quickbooks_enabled: v })} />
          {settings.quickbooks_enabled && (
            <div className="w-64 pl-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sync Frequency</label>
              <select value={settings.quickbooks_sync_frequency} onChange={(e) => setSettings({ ...settings, quickbooks_sync_frequency: e.target.value })} className={inputClass}>
                <option value="realtime">Real-time</option><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
              </select>
            </div>
          )}
          <SettingsToggle label="Google Calendar Sync" desc="Sync job schedules with Google Calendar" checked={settings.google_calendar_sync} onChange={(v) => setSettings({ ...settings, google_calendar_sync: v })} />
          <SettingsToggle label="Email Reports" desc="Send automated reports via email" checked={settings.email_reports_enabled} onChange={(v) => setSettings({ ...settings, email_reports_enabled: v })} />
          {settings.email_reports_enabled && (
            <div className="pl-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Recipients</label>
              <input type="text" value={settings.email_report_recipients} onChange={(e) => setSettings({ ...settings, email_report_recipients: e.target.value })}
                placeholder="boss@company.com, manager@company.com" className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">Comma-separated email addresses</p>
            </div>
          )}
          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Webhook URL (Advanced)</label>
            <input type="url" value={settings.webhook_url} onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
              placeholder="https://hooks.example.com/webhook" className={inputClass} />
            <p className="text-xs text-gray-400 mt-1">Send event data to external services</p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save Integration Settings"}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPanelTab() {
  const [accounts, setAccounts] = useState<{username: string; role: string; name: string}[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("local_auth_accounts");
      if (raw) {
        const parsed = JSON.parse(raw);
        setAccounts(parsed.map((a: Record<string, string>) => ({ username: a.username || "", role: a.role || "employee", name: a.name || a.username || "" })));
      }
    } catch {}
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Admin Panel</h3>
        <p className="text-sm text-gray-500 mb-4">Manage system accounts and roles. For full admin features, visit the Admin page.</p>
        <div className="space-y-2">
          {accounts.length === 0 && <p className="text-sm text-gray-400">No accounts found. Create accounts from the login page.</p>}
          {accounts.map((a, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                  {a.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{a.name}</span>
                  <span className="text-xs text-gray-400 ml-2">@{a.username}</span>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                a.role === "CreativeEditor" ? "bg-red-100 text-red-700" :
                a.role === "company_owner" ? "bg-purple-100 text-purple-700" :
                a.role === "field_manager" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-700"
              }`}>{a.role}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="/admin" className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 transition-colors">
            <span className="text-xl">🛠</span><div><div className="text-sm font-medium">Full Admin Panel</div><div className="text-xs text-gray-400">Account management & system controls</div></div>
          </a>
          <a href="/dev-tools" className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 transition-colors">
            <span className="text-xl">🔬</span><div><div className="text-sm font-medium">Dev Tools</div><div className="text-xs text-gray-400">Error logs, debug, & diagnostics</div></div>
          </a>
          <a href="/system" className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 transition-colors">
            <span className="text-xl">ℹ️</span><div><div className="text-sm font-medium">System Info</div><div className="text-xs text-gray-400">Version, environment, & system status</div></div>
          </a>
          <a href="/employees" className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 transition-colors">
            <span className="text-xl">👥</span><div><div className="text-sm font-medium">Employee Management</div><div className="text-xs text-gray-400">Full employee & payroll system</div></div>
          </a>
        </div>
      </div>
    </div>
  );
}

function DevToolsTab() {
  const [errorLog, setErrorLog] = useState<{id: string; timestamp: string; level: string; source: string; message: string}[]>([]);
  const [storageUsage, setStorageUsage] = useState<{key: string; size: string}[]>([]);

  useEffect(() => {
    // Load error log
    try {
      const raw = localStorage.getItem("jobsite_error_log");
      if (raw) setErrorLog(JSON.parse(raw).slice(0, 20));
    } catch {}

    // Calculate storage usage
    const usage: {key: string; size: string}[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || "";
        const sizeKB = (new Blob([val]).size / 1024).toFixed(1);
        usage.push({ key, size: `${sizeKB} KB` });
      }
    }
    usage.sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
    setStorageUsage(usage);
  }, []);

  function clearErrors() {
    localStorage.removeItem("jobsite_error_log");
    setErrorLog([]);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Error Log</h3>
          {errorLog.length > 0 && (
            <button onClick={clearErrors} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200">Clear Log</button>
          )}
        </div>
        {errorLog.length === 0 ? (
          <p className="text-sm text-gray-400">No errors logged. System is running clean.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {errorLog.map((e) => (
              <div key={e.id} className={`p-3 rounded-lg border text-xs font-mono ${
                e.level === "error" || e.level === "crash" ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"
              }`}>
                <div className="flex justify-between"><span className="font-bold">[{e.level.toUpperCase()}] {e.source}</span><span className="text-gray-400">{new Date(e.timestamp).toLocaleString()}</span></div>
                <div className="mt-1">{e.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg mb-4">Storage Usage</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {storageUsage.map((s) => (
            <div key={s.key} className="flex justify-between py-1 px-2 text-xs font-mono hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
              <span className="text-gray-600 dark:text-gray-400 truncate mr-4">{s.key}</span>
              <span className="text-gray-900 dark:text-gray-200 whitespace-nowrap">{s.size}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
          Total keys: {storageUsage.length} · Total size: {storageUsage.reduce((sum, s) => sum + parseFloat(s.size), 0).toFixed(1)} KB
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN SETTINGS PAGE WITH OFFICE TOGGLE
// ══════════════════════════════════════════════════════════════════════════

interface TabDef {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType;
  officeOnly?: boolean;
}

const REGULAR_TABS: TabDef[] = [
  { id: "company", label: "Company", icon: "🏢", component: CompanyTab },
  { id: "employees", label: "Employees", icon: "👥", component: EmployeesTab },
  { id: "jobsites", label: "Job Sites", icon: "📍", component: JobSitesTab },
  { id: "hours", label: "Pay Clock", icon: "⏱", component: HoursSettingsTab },
  { id: "display", label: "Display", icon: "🎨", component: DisplayTab },
  { id: "notifications", label: "Alerts", icon: "🔔", component: NotificationsTab },
  { id: "naf", label: "Feed", icon: "📡", component: NafSettingsTab },
  { id: "data", label: "Data & Export", icon: "📊", component: DataTab },
];

const OFFICE_TABS: TabDef[] = [
  { id: "admin", label: "Admin Panel", icon: "🛠", component: AdminPanelTab, officeOnly: true },
  { id: "devtools", label: "Dev Tools", icon: "🔬", component: DevToolsTab, officeOnly: true },
  { id: "security", label: "Security", icon: "🔐", component: SecurityTab, officeOnly: true },
  { id: "safety", label: "Safety", icon: "⛑", component: SafetyTab, officeOnly: true },
  { id: "gps", label: "GPS & Location", icon: "📡", component: GpsTab, officeOnly: true },
  { id: "automation", label: "Automation", icon: "⚡", component: AutomationTab, officeOnly: true },
  { id: "integrations", label: "Integrations", icon: "🔗", component: IntegrationsTab, officeOnly: true },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const [officeMode, setOfficeMode] = useState(false);
  const [showOfficePrompt, setShowOfficePrompt] = useState(false);
  const [officeCodeInput, setOfficeCodeInput] = useState("");
  const [officeError, setOfficeError] = useState("");
  const [logoClicks, setLogoClicks] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Check if office mode was previously unlocked this session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(LS_OFFICE_MODE);
      if (stored === "true") setOfficeMode(true);
    }
  }, []);

  // Handle logo click (3 rapid clicks to reveal the office prompt)
  function handleLogoClick() {
    const now = Date.now();
    if (now - lastClickTime > 2000) {
      setLogoClicks(1);
    } else {
      const newClicks = logoClicks + 1;
      setLogoClicks(newClicks);
      if (newClicks >= 3) {
        setShowOfficePrompt(true);
        setLogoClicks(0);
      }
    }
    setLastClickTime(now);
  }

  function handleOfficeUnlock() {
    const securitySettings = getLocalSettings("security");
    const correctCode = (securitySettings as Record<string, unknown>)?.office_code as string || "OFFICE";
    if (officeCodeInput.toUpperCase() === correctCode.toUpperCase()) {
      setOfficeMode(true);
      setShowOfficePrompt(false);
      setOfficeCodeInput("");
      setOfficeError("");
      sessionStorage.setItem(LS_OFFICE_MODE, "true");
    } else {
      setOfficeError("Invalid code. Try again.");
    }
  }

  function handleOfficeLock() {
    setOfficeMode(false);
    sessionStorage.removeItem(LS_OFFICE_MODE);
    // If viewing an office-only tab, switch back to company
    if (OFFICE_TABS.find((t) => t.id === activeTab)) {
      setActiveTab("company");
    }
  }

  const allTabs = officeMode ? [...REGULAR_TABS, ...OFFICE_TABS] : REGULAR_TABS;
  const activeTabDef = allTabs.find((t) => t.id === activeTab) || REGULAR_TABS[0];
  const ActiveComponent = activeTabDef.component;

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-5">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure Install Operations for your team</p>
      </div>

      <div className="flex gap-4 min-h-[600px]">
        {/* Sidebar nav */}
        <div className="w-48 flex-shrink-0">
          <nav className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {REGULAR_TABS.map((tab, i) => (
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
                {activeTab === tab.id && <span className="ml-auto text-green-600 text-xs">›</span>}
              </button>
            ))}

            {/* Office Mode Divider & Tabs */}
            {officeMode && (
              <>
                <div className="border-t-2 border-amber-300 bg-amber-50 px-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Office Mode</span>
                    <button onClick={handleOfficeLock} className="text-xs text-amber-600 hover:text-amber-800" title="Lock Office Mode">
                      🔓
                    </button>
                  </div>
                </div>
                {OFFICE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left border-t border-amber-100 ${
                      activeTab === tab.id
                        ? "bg-amber-50 text-amber-800 font-semibold"
                        : "text-gray-600 hover:bg-amber-50/50"
                    }`}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                    {activeTab === tab.id && <span className="ml-auto text-amber-600 text-xs">›</span>}
                  </button>
                ))}
              </>
            )}
          </nav>

          {/* App info with hidden OFFICE trigger */}
          <div className="mt-4 bg-gray-900 rounded-2xl p-4 text-center cursor-pointer select-none" onClick={handleLogoClick}>
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white font-black text-base mx-auto mb-2">IO</div>
            <p className="text-white text-xs font-bold">Install Operations</p>
            <p className="text-gray-500 text-xs mt-0.5">v2.0</p>
            {officeMode && <p className="text-amber-400 text-xs mt-1 font-medium">OFFICE MODE</p>}
            {!officeMode && logoClicks > 0 && <p className="text-gray-600 text-xs mt-1">{"·".repeat(logoClicks)}</p>}
          </div>
        </div>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{activeTabDef.icon}</span>
            <h2 className="text-lg font-bold text-gray-900">{activeTabDef.label}</h2>
            {activeTabDef.officeOnly && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Office Only</span>
            )}
          </div>
          <ActiveComponent />
        </div>
      </div>

      {/* Office Mode Unlock Modal */}
      {showOfficePrompt && !officeMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowOfficePrompt(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center text-2xl mx-auto mb-3">🔒</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Enter Office Mode</h3>
              <p className="text-sm text-gray-500 mt-1">Enter the office code to unlock admin and developer settings.</p>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={officeCodeInput}
                onChange={(e) => { setOfficeCodeInput(e.target.value); setOfficeError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleOfficeUnlock()}
                placeholder="Office Code"
                autoFocus
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
              />
              {officeError && <p className="text-sm text-red-500 text-center">{officeError}</p>}
              <button onClick={handleOfficeUnlock}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg text-sm transition-colors">
                Unlock Office Mode
              </button>
              <button onClick={() => { setShowOfficePrompt(false); setOfficeCodeInput(""); setOfficeError(""); }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
