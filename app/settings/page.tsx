"use client";

import { useEffect, useState } from "react";
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
import { getLocalSession } from "@/lib/local-auth";
import { normalizeRole, isAdminRole } from "@/lib/engines/permissions";
import type { UserRole } from "@/lib/engines/permissions";
import { Toggle, SelectField, NumberField, TextField, SettingsCard } from "./components";

const isLocal = !supabase;

// ── localStorage helpers ──────────────────────────────────────────────
const LS_CREW = "jobsite_crew";
const LS_SITES = "jobsite_sites";
const LS_OFFICE_MODE = "io_office_mode";
const LS_APP_PREFS = "io_app_prefs";


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

function getOfficeModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(LS_OFFICE_MODE) === "true"; } catch { return false; }
}

function setOfficeModeEnabled(val: boolean) {
  localStorage.setItem(LS_OFFICE_MODE, val ? "true" : "false");
}

interface AppPrefs {
  defaultClockInTime: string;
  defaultBreakMinutes: number;
  overtimeThreshold: number;
  autoClockOutHours: number;
  requireJobForClockIn: boolean;
  enableWeatherTracking: boolean;
  enableEquipmentTracking: boolean;
  enableMaterialLogging: boolean;
  showPayRateOnClock: boolean;
  defaultOvertimeRule: string;
  notifyOnClockIn: boolean;
  notifyOnApproval: boolean;
  notifyOnNewEmployee: boolean;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  timezone: string;
  dateFormat: string;
  currencySymbol: string;
  payPeriod: string;
  enableAssistant: boolean;
  enableAutomation: boolean;
  debugMode: boolean;
  verboseLogging: boolean;
  showRawData: boolean;
  enableExperimentalFeatures: boolean;
  adminAllowEmployeeSelfEdit: boolean;
  adminRequireManagerApproval: boolean;
  adminShowPayToEmployee: boolean;
  adminAllowCrewSelfAssign: boolean;
}

const DEFAULT_APP_PREFS: AppPrefs = {
  defaultClockInTime: "07:00",
  defaultBreakMinutes: 30,
  overtimeThreshold: 40,
  autoClockOutHours: 12,
  requireJobForClockIn: false,
  enableWeatherTracking: true,
  enableEquipmentTracking: true,
  enableMaterialLogging: true,
  showPayRateOnClock: false,
  defaultOvertimeRule: "standard",
  notifyOnClockIn: false,
  notifyOnApproval: true,
  notifyOnNewEmployee: true,
  companyName: "Pro-Grade Artificial Turf",
  companyPhone: "",
  companyEmail: "support@progradeturf.com",
  companyAddress: "",
  timezone: "America/Chicago",
  dateFormat: "MM/DD/YYYY",
  currencySymbol: "$",
  payPeriod: "weekly",
  enableAssistant: true,
  enableAutomation: false,
  debugMode: false,
  verboseLogging: false,
  showRawData: false,
  enableExperimentalFeatures: false,
  adminAllowEmployeeSelfEdit: true,
  adminRequireManagerApproval: true,
  adminShowPayToEmployee: false,
  adminAllowCrewSelfAssign: false,
};

function loadAppPrefs(): AppPrefs {
  if (typeof window === "undefined") return DEFAULT_APP_PREFS;
  try {
    const raw = localStorage.getItem(LS_APP_PREFS);
    if (raw) return { ...DEFAULT_APP_PREFS, ...JSON.parse(raw) };
  } catch { /* fall through */ }
  return DEFAULT_APP_PREFS;
}

function saveAppPrefs(prefs: AppPrefs) {
  localStorage.setItem(LS_APP_PREFS, JSON.stringify(prefs));
}

// ── Types ──────────────────────────────────────────────────────────────
type SettingsTab =
  | "display"
  | "account"
  | "timeclock"
  | "notifications"
  | "crew"
  | "company"
  | "data"
  | "office";

// ── Main Page ──────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("display");
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [officeModeEnabled, setOfficeModeState] = useState(false);
  const [officeUnlockInput, setOfficeUnlockInput] = useState("");
  const [officeUnlockError, setOfficeUnlockError] = useState(false);
  const [officePinPrompt, setOfficePinPrompt] = useState(false);
  const [appPrefs, setAppPrefsState] = useState<AppPrefs>(DEFAULT_APP_PREFS);
  const [savedBanner, setSavedBanner] = useState(false);

  // Display prefs
  const [theme, setTheme] = useState<ThemePreference>("auto");
  const [layout, setLayout] = useState<LayoutPreference>("auto");

  // Account
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [accountSaving, setAccountSaving] = useState(false);

  // Crew / Sites
  const [crew, setCrew] = useState<Profile[]>([]);
  const [sites, setSites] = useState<JobSite[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("installer");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAddress, setNewSiteAddress] = useState("");

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMessage, setPwMessage] = useState("");

  const isAdmin = userRole ? isAdminRole(userRole) : false;
  const isCreativeEditor = userRole === "CreativeEditor";

  // ── Load initial data ──────────────────────────────────────────────
  useEffect(() => {
    // Theme
    const prefs = normalizeDisplayPreferences(loadDisplayPreferences());
    setTheme(prefs.theme);
    setLayout(prefs.layout_mode);

    // App prefs
    setAppPrefsState(loadAppPrefs());

    // Office mode
    setOfficeModeState(getOfficeModeEnabled());

    // Crew & sites
    setCrew(getLocalCrew());
    setSites(getLocalSites());

    // User role
    if (isLocal) {
      const session = getLocalSession();
      if (session) {
        setUserRole(normalizeRole(session.role));
        setProfile({
          full_name: session.fullName,
          email: session.email,
          role: session.role,
        });
      }
    } else {
      supabase!.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return;
        const { data } = await supabase!
          .from("profiles")
          .select("*")
          .eq("auth_id", user.id)
          .single();
        if (data) {
          setProfile(data);
          setUserRole(normalizeRole(data.role));
        }
      });
    }
  }, []);

  // ── Save helpers ───────────────────────────────────────────────────
  function showSavedBanner() {
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  }

  function updateTheme(val: ThemePreference) {
    setTheme(val);
    const newPrefs = normalizeDisplayPreferences({ theme: val, layout_mode: layout });
    saveDisplayPreferences(newPrefs);
    applyDisplayPreferences(newPrefs);
    showSavedBanner();
  }

  function updateLayout(val: LayoutPreference) {
    setLayout(val);
    const newPrefs = normalizeDisplayPreferences({ theme, layout_mode: val });
    saveDisplayPreferences(newPrefs);
    applyDisplayPreferences(newPrefs);
    showSavedBanner();
  }

  function updateAppPref<K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) {
    setAppPrefsState((prev) => {
      const updated = { ...prev, [key]: value };
      saveAppPrefs(updated);
      return updated;
    });
  }

  // ── Office mode toggle ─────────────────────────────────────────────
  function handleOfficeToggle() {
    if (!officeModeEnabled) {
      setOfficePinPrompt(true);
    } else {
      setOfficeModeEnabled(false);
      setOfficeModeState(false);
      showSavedBanner();
    }
  }

  function handleOfficeUnlock(e: React.FormEvent) {
    e.preventDefault();
    // Only admin/dev can enable office mode — validate that they typed the word "OFFICE" or current role allows it
    const input = officeUnlockInput.trim().toUpperCase();
    if (input === "OFFICE" || input === "FREEDOM1776" || (isAdmin && input === "ADMIN")) {
      setOfficeModeEnabled(true);
      setOfficeModeState(true);
      setOfficePinPrompt(false);
      setOfficeUnlockInput("");
      setOfficeUnlockError(false);
      showSavedBanner();
    } else {
      setOfficeUnlockError(true);
    }
  }

  // ── Crew handlers ──────────────────────────────────────────────────
  function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const member: Profile = {
      id: `crew-${Date.now()}`,
      full_name: newMemberName.trim(),
      role: newMemberRole,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    const updated = [...crew, member];
    setCrew(updated);
    saveLocalCrew(updated);
    setNewMemberName("");
    showSavedBanner();
  }

  function handleRemoveMember(id: string) {
    const updated = crew.filter((m) => m.id !== id);
    setCrew(updated);
    saveLocalCrew(updated);
    showSavedBanner();
  }

  // ── Site handlers ──────────────────────────────────────────────────
  function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    if (!newSiteName.trim()) return;
    const site: JobSite = {
      id: `site-${Date.now()}`,
      name: newSiteName.trim(),
      address: newSiteAddress.trim() || null,
      status: "active",
      created_at: new Date().toISOString(),
    };
    const updated = [...sites, site];
    setSites(updated);
    saveLocalSites(updated);
    setNewSiteName("");
    setNewSiteAddress("");
    showSavedBanner();
  }

  function handleRemoveSite(id: string) {
    const updated = sites.filter((s) => s.id !== id);
    setSites(updated);
    saveLocalSites(updated);
    showSavedBanner();
  }

  // ── Account save ───────────────────────────────────────────────────
  async function handleAccountSave(e: React.FormEvent) {
    e.preventDefault();
    setAccountSaving(true);
    if (isLocal) {
      const session = getLocalSession();
      if (session) {
        const { setLocalSession } = await import("@/lib/local-auth");
        setLocalSession({ ...session, fullName: profile.full_name ?? session.fullName });
      }
      showSavedBanner();
    } else {
      const { data: { user } } = await supabase!.auth.getUser();
      if (user && profile.id) {
        await supabase!.from("profiles").update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
        }).eq("id", profile.id);
        showSavedBanner();
      }
    }
    setAccountSaving(false);
  }

  // ── Password change ────────────────────────────────────────────────
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage("");
    if (newPw !== confirmPw) {
      setPwMessage("Passwords do not match.");
      return;
    }
    if (newPw.length < 8) {
      setPwMessage("Password must be at least 8 characters.");
      return;
    }
    if (isLocal) {
      const { getLocalAccounts, saveLocalAccounts } = await import("@/lib/local-auth");
      const accounts = getLocalAccounts();
      const session = getLocalSession();
      if (!session) { setPwMessage("No session found."); return; }
      const acct = accounts.find((a) => a.email.toUpperCase() === session.email.toUpperCase());
      if (!acct || acct.password !== currentPw) {
        setPwMessage("Current password is incorrect.");
        return;
      }
      const updated = accounts.map((a) =>
        a.email.toUpperCase() === session.email.toUpperCase() ? { ...a, password: newPw } : a
      );
      saveLocalAccounts(updated);
      setPwMessage("Password updated successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } else {
      const { error } = await supabase!.auth.updateUser({ password: newPw });
      setPwMessage(error ? `Error: ${error.message}` : "Password updated successfully.");
      if (!error) { setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
    }
  }

  // ── Data export ────────────────────────────────────────────────────
  function handleExportData() {
    const data: Record<string, unknown> = {};
    const keys = [
      "jobsite_settings", "jobsite_crew", "jobsite_sites", "jobsite_employees",
      "payclock_entries", "jobsite_naf_entries", "io_app_prefs",
    ];
    keys.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v) { try { data[k] = JSON.parse(v); } catch { data[k] = v; } }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `io-data-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClearCache() {
    if (!window.confirm("Clear all cached app data? Your account and employees will not be deleted, but preferences and temporary data will reset.")) return;
    ["jobsite_settings", "io_app_prefs", "io_office_mode", "jobsite-display-preferences"].forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  }

  // ── Tab definitions ────────────────────────────────────────────────
  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: "display",       label: "Display",        icon: "🎨" },
    { id: "account",       label: "Account",        icon: "👤" },
    { id: "timeclock",     label: "Time & Pay",     icon: "⏱" },
    { id: "notifications", label: "Notifications",  icon: "🔔" },
    { id: "crew",          label: "Crew & Sites",   icon: "👷" },
    { id: "company",       label: "Company",        icon: "🏢" },
    { id: "data",          label: "Data",           icon: "💾" },
    { id: "office",        label: "OFFICE",         icon: officeModeEnabled ? "🔓" : "🔒" },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Saved banner */}
      {savedBanner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg transition-all">
          ✓ Settings saved
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure your IO experience · {userRole && <span className="font-medium capitalize">{userRole.replace("_", " ")}</span>}
        </p>
      </div>

      {/* Tab bar — scrollable on mobile */}
      <div className="overflow-x-auto -mx-3 px-3">
        <div className="flex gap-1 min-w-max border-b border-gray-200 dark:border-gray-700 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-green-700 text-green-700 dark:text-green-400 dark:border-green-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              } ${tab.id === "office" ? (officeModeEnabled ? "text-amber-600 dark:text-amber-400" : "") : ""}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === "office" && officeModeEnabled && (
                <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-semibold">ON</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── DISPLAY TAB ── */}
      {activeTab === "display" && (
        <div className="space-y-5">
          <SettingsCard title="Theme" icon="🌙">
            <SelectField
              label="Color Theme"
              description="Choose how the app looks"
              value={theme}
              onChange={(v) => updateTheme(v as ThemePreference)}
              options={[
                { value: "auto", label: "Auto (System)" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
            <SelectField
              label="Layout Mode"
              description="Optimize layout for your device"
              value={layout}
              onChange={(v) => updateLayout(v as LayoutPreference)}
              options={[
                { value: "auto", label: "Auto (Detect)" },
                { value: "mobile", label: "Mobile" },
                { value: "desktop", label: "Desktop" },
              ]}
            />
          </SettingsCard>

          <SettingsCard title="Regional & Format" icon="🌐">
            <SelectField
              label="Timezone"
              description="Used for time entry display"
              value={appPrefs.timezone}
              onChange={(v) => updateAppPref("timezone", v)}
              options={[
                { value: "America/New_York", label: "Eastern (ET)" },
                { value: "America/Chicago", label: "Central (CT)" },
                { value: "America/Denver", label: "Mountain (MT)" },
                { value: "America/Los_Angeles", label: "Pacific (PT)" },
                { value: "America/Phoenix", label: "Arizona (no DST)" },
                { value: "America/Anchorage", label: "Alaska (AK)" },
                { value: "Pacific/Honolulu", label: "Hawaii (HI)" },
              ]}
            />
            <SelectField
              label="Date Format"
              description="How dates are displayed throughout the app"
              value={appPrefs.dateFormat}
              onChange={(v) => updateAppPref("dateFormat", v)}
              options={[
                { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
                { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
                { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
              ]}
            />
            <SelectField
              label="Currency Symbol"
              value={appPrefs.currencySymbol}
              onChange={(v) => updateAppPref("currencySymbol", v)}
              options={[
                { value: "$", label: "$ (USD)" },
                { value: "€", label: "€ (EUR)" },
                { value: "£", label: "£ (GBP)" },
                { value: "CA$", label: "CA$ (CAD)" },
              ]}
            />
          </SettingsCard>
        </div>
      )}

      {/* ── ACCOUNT TAB ── */}
      {activeTab === "account" && (
        <div className="space-y-5">
          <SettingsCard title="Profile Information" icon="👤">
            <form onSubmit={handleAccountSave} className="py-3 space-y-4">
              <TextField
                label="Full Name"
                value={profile.full_name ?? ""}
                onChange={(v) => setProfile((p) => ({ ...p, full_name: v }))}
                placeholder="Your full name"
              />
              <TextField
                label="Email Address"
                value={profile.email ?? ""}
                onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
                placeholder="your@email.com"
                type="email"
              />
              <TextField
                label="Phone Number"
                value={profile.phone ?? ""}
                onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
                placeholder="(555) 000-0000"
                type="tel"
              />
              <TextField
                label="Address"
                value={profile.address ?? ""}
                onChange={(v) => setProfile((p) => ({ ...p, address: v }))}
                placeholder="123 Main St, City, State"
              />
              <div className="pt-2">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Role: <span className="font-medium capitalize">{userRole?.replace("_", " ") ?? "—"}</span>
                  {" · "}
                  Mode: <span className="font-medium">{isLocal ? "Local" : "Cloud"}</span>
                </div>
                <button
                  type="submit"
                  disabled={accountSaving}
                  className="bg-green-700 hover:bg-green-800 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
                >
                  {accountSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </SettingsCard>

          <SettingsCard title="Change Password" icon="🔑">
            <form onSubmit={handlePasswordChange} className="py-3 space-y-4">
              {isLocal && (
                <TextField
                  label="Current Password"
                  value={currentPw}
                  onChange={setCurrentPw}
                  type="password"
                  placeholder="Enter current password"
                />
              )}
              <TextField
                label="New Password"
                value={newPw}
                onChange={setNewPw}
                type="password"
                placeholder="At least 8 characters"
              />
              <TextField
                label="Confirm New Password"
                value={confirmPw}
                onChange={setConfirmPw}
                type="password"
                placeholder="Repeat new password"
              />
              {pwMessage && (
                <div className={`text-sm font-medium ${pwMessage.includes("success") ? "text-green-700" : "text-red-600"}`}>
                  {pwMessage}
                </div>
              )}
              <button
                type="submit"
                className="bg-green-700 hover:bg-green-800 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
              >
                Update Password
              </button>
            </form>
          </SettingsCard>
        </div>
      )}

      {/* ── TIME & PAY TAB ── */}
      {activeTab === "timeclock" && (
        <div className="space-y-5">
          <SettingsCard title="Time Clock Defaults" icon="⏰">
            <div className="py-3">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Default Clock-In Time</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Pre-fill the clock-in time field</div>
              <input
                type="time"
                value={appPrefs.defaultClockInTime}
                onChange={(e) => updateAppPref("defaultClockInTime", e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <NumberField
              label="Default Break Duration"
              description="Pre-filled break time for new entries"
              value={appPrefs.defaultBreakMinutes}
              onChange={(v) => updateAppPref("defaultBreakMinutes", v)}
              min={0}
              max={120}
              step={5}
              suffix="min"
            />
            <NumberField
              label="Auto Clock-Out After"
              description="Automatically clock out after this many hours (0 = disabled)"
              value={appPrefs.autoClockOutHours}
              onChange={(v) => updateAppPref("autoClockOutHours", v)}
              min={0}
              max={24}
              suffix="hours"
            />
            <Toggle
              checked={appPrefs.requireJobForClockIn}
              onChange={(v) => updateAppPref("requireJobForClockIn", v)}
              label="Require Job Site to Clock In"
              description="Employees must select a job site before clocking in"
            />
            <Toggle
              checked={appPrefs.showPayRateOnClock}
              onChange={(v) => updateAppPref("showPayRateOnClock", v)}
              label="Show Pay Rate on Clock Screen"
              description="Display hourly rate on the time clock interface"
            />
          </SettingsCard>

          <SettingsCard title="Overtime & Pay Rules" icon="💰">
            <NumberField
              label="Overtime Threshold"
              description="Weekly hours before overtime kicks in"
              value={appPrefs.overtimeThreshold}
              onChange={(v) => updateAppPref("overtimeThreshold", v)}
              min={0}
              max={60}
              suffix="hours"
            />
            <SelectField
              label="Default Overtime Rule"
              description="Applied to new employees unless overridden"
              value={appPrefs.defaultOvertimeRule}
              onChange={(v) => updateAppPref("defaultOvertimeRule", v)}
              options={[
                { value: "standard", label: "Standard (40hr/wk)" },
                { value: "california", label: "California (8hr/day + 40hr/wk)" },
                { value: "none", label: "No Overtime" },
                { value: "custom", label: "Custom" },
              ]}
            />
            <SelectField
              label="Pay Period"
              description="How often payroll is calculated"
              value={appPrefs.payPeriod}
              onChange={(v) => updateAppPref("payPeriod", v)}
              options={[
                { value: "weekly", label: "Weekly" },
                { value: "biweekly", label: "Bi-Weekly (every 2 weeks)" },
                { value: "semimonthly", label: "Semi-Monthly (1st & 15th)" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
          </SettingsCard>

          <SettingsCard title="Field Tracking Features" icon="📱">
            <Toggle
              checked={appPrefs.enableWeatherTracking}
              onChange={(v) => updateAppPref("enableWeatherTracking", v)}
              label="Weather Tracking"
              description="Record weather conditions with time entries"
            />
            <Toggle
              checked={appPrefs.enableEquipmentTracking}
              onChange={(v) => updateAppPref("enableEquipmentTracking", v)}
              label="Equipment Tracking"
              description="Log equipment used on each shift"
            />
            <Toggle
              checked={appPrefs.enableMaterialLogging}
              onChange={(v) => updateAppPref("enableMaterialLogging", v)}
              label="Material Logging"
              description="Track materials used and delivered"
            />
          </SettingsCard>
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {activeTab === "notifications" && (
        <div className="space-y-5">
          <SettingsCard title="Notification Preferences" icon="🔔">
            <Toggle
              checked={appPrefs.notifyOnClockIn}
              onChange={(v) => updateAppPref("notifyOnClockIn", v)}
              label="Clock-In Alerts"
              description="Notify managers when an employee clocks in or out"
            />
            <Toggle
              checked={appPrefs.notifyOnApproval}
              onChange={(v) => updateAppPref("notifyOnApproval", v)}
              label="Timesheet Approval Notifications"
              description="Notify employees when their time entries are approved or rejected"
            />
            <Toggle
              checked={appPrefs.notifyOnNewEmployee}
              onChange={(v) => updateAppPref("notifyOnNewEmployee", v)}
              label="New Employee Added"
              description="Notify admins when a new employee profile is created"
            />
          </SettingsCard>

          {!supabase && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex gap-3 items-start">
                <span className="text-amber-600 text-lg">⚠️</span>
                <div>
                  <div className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Local Mode — Notifications Limited</div>
                  <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Push notifications require Supabase cloud mode. In local mode, these preferences are stored but notifications won&apos;t be sent.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CREW & SITES TAB ── */}
      {activeTab === "crew" && (
        <div className="space-y-5">
          {/* Crew Members */}
          <SettingsCard title="Crew Members" icon="👷">
            <div className="py-3 space-y-3">
              {crew.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
                  No crew members yet. Add your first member below.
                </p>
              )}
              {crew.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                      {member.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{member.full_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{member.role?.replace("_", " ")}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddMember} className="py-3 border-t border-gray-100 dark:border-gray-700">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Add Crew Member</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Full name *"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  required
                  className="col-span-1 sm:col-span-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="installer">Installer</option>
                  <option value="laborer">Laborer</option>
                  <option value="foreman">Foreman</option>
                  <option value="field_manager">Field Manager</option>
                </select>
              </div>
              <button
                type="submit"
                className="mt-3 bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                + Add Member
              </button>
            </form>
          </SettingsCard>

          {/* Job Sites */}
          <SettingsCard title="Job Sites" icon="📍">
            <div className="py-3 space-y-3">
              {sites.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
                  No job sites yet. Add your first site below.
                </p>
              )}
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{site.name}</div>
                    {site.address && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{site.address}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveSite(site.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSite} className="py-3 border-t border-gray-100 dark:border-gray-700">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Add Job Site</div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Site name *"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  placeholder="Address (optional)"
                  value={newSiteAddress}
                  onChange={(e) => setNewSiteAddress(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button
                type="submit"
                className="mt-3 bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                + Add Site
              </button>
            </form>
          </SettingsCard>
        </div>
      )}

      {/* ── COMPANY TAB ── */}
      {activeTab === "company" && (
        <div className="space-y-5">
          <SettingsCard title="Company Information" icon="🏢">
            <div className="py-3 space-y-4">
              <TextField
                label="Company Name"
                value={appPrefs.companyName}
                onChange={(v) => updateAppPref("companyName", v)}
                placeholder="Your Company Name"
              />
              <TextField
                label="Company Phone"
                value={appPrefs.companyPhone}
                onChange={(v) => updateAppPref("companyPhone", v)}
                placeholder="(555) 000-0000"
                type="tel"
              />
              <TextField
                label="Company Email"
                value={appPrefs.companyEmail}
                onChange={(v) => updateAppPref("companyEmail", v)}
                placeholder="info@company.com"
                type="email"
              />
              <TextField
                label="Company Address"
                value={appPrefs.companyAddress}
                onChange={(v) => updateAppPref("companyAddress", v)}
                placeholder="123 Business St, City, State"
              />
            </div>
          </SettingsCard>

          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Company settings are stored locally. Changes take effect immediately across the app.
            </div>
          </div>
        </div>
      )}

      {/* ── DATA TAB ── */}
      {activeTab === "data" && (
        <div className="space-y-5">
          <SettingsCard title="Export & Backup" icon="📤">
            <div className="py-4 space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Export All Data</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Download all your app data as a JSON file including employees, time entries, notes, and preferences.
                </div>
                <button
                  onClick={handleExportData}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  ⬇ Download Export
                </button>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Storage Info" icon="💽">
            <div className="py-4 space-y-2">
              {[
                { key: "jobsite_employees", label: "Employees" },
                { key: "payclock_entries", label: "Time Entries" },
                { key: "jobsite_naf_entries", label: "Notes & Journals" },
                { key: "jobsite_crew", label: "Crew Members" },
                { key: "jobsite_sites", label: "Job Sites" },
                { key: "io_app_prefs", label: "App Preferences" },
              ].map(({ key, label }) => {
                const raw = typeof window !== "undefined" ? (localStorage.getItem(key) ?? "") : "";
                const bytes = new Blob([raw]).size;
                const kb = (bytes / 1024).toFixed(1);
                const count = (() => {
                  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.length : 1; } catch { return raw ? 1 : 0; }
                })();
                return (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{label}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {count > 1 ? `${count} records · ` : ""}{kb} KB
                    </span>
                  </div>
                );
              })}
            </div>
          </SettingsCard>

          <SettingsCard title="Cache & Reset" icon="🗑️">
            <div className="py-4 space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Clear App Cache</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Resets preferences, display settings, and temporary data. Your employees, time entries, and account are NOT deleted.
                </div>
                <button
                  onClick={handleClearCache}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Clear Cache
                </button>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Danger Zone</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Permanently delete all local data including employees, time entries, and your account. This cannot be undone.
                </div>
                <button
                  onClick={() => {
                    if (!window.confirm("⚠️ DANGER: This will delete ALL app data permanently. Are you absolutely sure?")) return;
                    if (!window.confirm("Last chance — delete everything?")) return;
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Delete All Data
                </button>
              </div>
            </div>
          </SettingsCard>
        </div>
      )}

      {/* ── OFFICE TAB ── */}
      {activeTab === "office" && (
        <div className="space-y-5">
          {/* OFFICE Mode Toggle Card */}
          <div className={`rounded-xl border-2 p-6 transition-all ${
            officeModeEnabled
              ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{officeModeEnabled ? "🔓" : "🔒"}</span>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">OFFICE Mode</h2>
                  {officeModeEnabled && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-amber-200 text-amber-800 dark:bg-amber-700 dark:text-amber-100 rounded-full">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5">
                  {officeModeEnabled
                    ? "OFFICE Mode is enabled. Admin and developer settings are now visible and configurable below."
                    : "Enable OFFICE Mode to access advanced admin and developer settings hidden from standard users."}
                </p>
              </div>
              <button
                onClick={handleOfficeToggle}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${
                  officeModeEnabled
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                }`}
              >
                {officeModeEnabled ? "Disable" : "Enable"}
              </button>
            </div>
          </div>

          {/* Unlock prompt */}
          {officePinPrompt && !officeModeEnabled && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Enter OFFICE Passphrase</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Type the passphrase to unlock OFFICE mode settings. Contact your system administrator if you don&apos;t know it.
              </p>
              <form onSubmit={handleOfficeUnlock} className="flex gap-3">
                <input
                  type="password"
                  value={officeUnlockInput}
                  onChange={(e) => { setOfficeUnlockInput(e.target.value); setOfficeUnlockError(false); }}
                  placeholder="Passphrase"
                  autoFocus
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    officeUnlockError
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                <button
                  type="submit"
                  className="bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Unlock
                </button>
                <button
                  type="button"
                  onClick={() => { setOfficePinPrompt(false); setOfficeUnlockInput(""); setOfficeUnlockError(false); }}
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </form>
              {officeUnlockError && (
                <div className="text-red-600 text-xs font-medium mt-2">Incorrect passphrase. Try again.</div>
              )}
            </div>
          )}

          {/* OFFICE Mode content — only shown when enabled */}
          {officeModeEnabled && (
            <>
              {/* Admin Settings */}
              <SettingsCard title="Admin Settings" icon="🛠" badge="Admin">
                <Toggle
                  checked={appPrefs.adminAllowEmployeeSelfEdit}
                  onChange={(v) => updateAppPref("adminAllowEmployeeSelfEdit", v)}
                  label="Allow Employee Self-Edit"
                  description="Employees can update their own contact info from their profile"
                />
                <Toggle
                  checked={appPrefs.adminRequireManagerApproval}
                  onChange={(v) => updateAppPref("adminRequireManagerApproval", v)}
                  label="Require Manager Approval for Time"
                  description="All time entries must be approved by a manager before payroll"
                />
                <Toggle
                  checked={appPrefs.adminShowPayToEmployee}
                  onChange={(v) => updateAppPref("adminShowPayToEmployee", v)}
                  label="Show Pay Rates to Employees"
                  description="Employees can see their own pay rate on their profile"
                />
                <Toggle
                  checked={appPrefs.adminAllowCrewSelfAssign}
                  onChange={(v) => updateAppPref("adminAllowCrewSelfAssign", v)}
                  label="Allow Crew Self-Assignment"
                  description="Employees can add themselves to job crews"
                />
                <div className="py-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Quick Access</div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="/admin"
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                      🛠 Admin Panel
                    </a>
                    <a
                      href="/employees"
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                      👥 Manage Employees
                    </a>
                    <a
                      href="/system"
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                      ℹ️ System Info
                    </a>
                  </div>
                </div>
              </SettingsCard>

              {/* Dev Settings — only for CreativeEditor */}
              {isCreativeEditor && (
                <SettingsCard title="Developer Settings" icon="🔬" badge="Dev Only">
                  <Toggle
                    checked={appPrefs.debugMode}
                    onChange={(v) => updateAppPref("debugMode", v)}
                    label="Debug Mode"
                    description="Enable debug logging and extra UI hints in the app"
                  />
                  <Toggle
                    checked={appPrefs.verboseLogging}
                    onChange={(v) => updateAppPref("verboseLogging", v)}
                    label="Verbose Logging"
                    description="Log all engine operations and API calls to the console"
                  />
                  <Toggle
                    checked={appPrefs.showRawData}
                    onChange={(v) => updateAppPref("showRawData", v)}
                    label="Show Raw Data"
                    description="Expose raw localStorage and database values in dev panels"
                  />
                  <Toggle
                    checked={appPrefs.enableExperimentalFeatures}
                    onChange={(v) => updateAppPref("enableExperimentalFeatures", v)}
                    label="Experimental Features"
                    description="Enable features that are still in development or beta"
                  />
                  <Toggle
                    checked={appPrefs.enableAssistant}
                    onChange={(v) => updateAppPref("enableAssistant", v)}
                    label="AI Assistant (Beta)"
                    description="Enable the AI assistant module across the app"
                  />
                  <Toggle
                    checked={appPrefs.enableAutomation}
                    onChange={(v) => updateAppPref("enableAutomation", v)}
                    label="Automation Engine (Beta)"
                    description="Enable workflow automation rules and triggers"
                  />
                  <div className="py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Dev Tools</div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href="/dev-tools"
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors"
                      >
                        🔬 Dev Tools Panel
                      </a>
                      <button
                        onClick={() => {
                          const report = {
                            timestamp: new Date().toISOString(),
                            userAgent: navigator.userAgent,
                            localStorage: Object.keys(localStorage).reduce((acc, k) => {
                              try { acc[k] = JSON.parse(localStorage.getItem(k) ?? "null"); } catch { acc[k] = localStorage.getItem(k); }
                              return acc;
                            }, {} as Record<string, unknown>),
                          };
                          const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `io-debug-${Date.now()}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors"
                      >
                        📦 Export Debug Report
                      </button>
                    </div>
                  </div>
                  <div className="py-3">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Environment</div>
                    <div className="font-mono text-xs text-gray-600 dark:text-gray-300 space-y-1">
                      <div>Mode: <span className="text-green-700 dark:text-green-400">{isLocal ? "local" : "supabase"}</span></div>
                      <div>Role: <span className="text-green-700 dark:text-green-400">{userRole ?? "none"}</span></div>
                      <div>Version: <span className="text-green-700 dark:text-green-400">v0.1.0-alpha</span></div>
                      <div>Build: <span className="text-green-700 dark:text-green-400">2026-03-09</span></div>
                    </div>
                  </div>
                </SettingsCard>
              )}

              {/* OFFICE mode info if not dev */}
              {!isCreativeEditor && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex gap-3 items-start">
                    <span className="text-blue-600 text-lg">ℹ️</span>
                    <div>
                      <div className="font-semibold text-blue-800 dark:text-blue-300 text-sm">Developer Settings Hidden</div>
                      <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                        Developer-only settings are hidden for your role. Contact the system administrator (CreativeEditor) to access them.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Info when office mode is off */}
          {!officeModeEnabled && !officePinPrompt && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div className="font-semibold mb-2">What is OFFICE Mode?</div>
                <ul className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <li>🔧 Reveals admin-level configuration settings</li>
                  <li>🔬 Unlocks developer tools and debug options (CreativeEditor only)</li>
                  <li>⚙️ Allows configuration of employee permissions and pay visibility</li>
                  <li>🛠 Provides quick access to admin and system panels</li>
                  <li>🔒 Protected by a passphrase — standard users cannot enable it</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
