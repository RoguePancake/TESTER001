"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, type Profile, type TimeEntry } from "@/lib/supabase";
import { getLocalSession } from "@/lib/local-auth";
import { normalizeRole, isManagerOrAbove, isAdminRole } from "@/lib/engines/permissions";
import type { UserRole } from "@/lib/engines/permissions";

// ── localStorage helpers ──────────────────────────────────────────────────
const LS_EMPLOYEES = "jobsite_employees";
const LS_ENTRIES = "payclock_entries";

function loadLocalEmployees(): Profile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_EMPLOYEES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalEmployees(employees: Profile[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_EMPLOYEES, JSON.stringify(employees));
  }
}

function loadLocalEntries(): TimeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_ENTRIES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Helpers ──────────────────────────────────────────────────────────────
function statusBadge(status?: string) {
  switch (status) {
    case "active": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "on_leave": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "inactive": return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    case "terminated": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "probation": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    default: return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  }
}

function calcCompleteness(p: Profile): number {
  const fields = [
    p.full_name, p.email, p.phone, p.role, p.hire_date,
    p.employment_type, p.default_pay_rate, p.address,
    p.emergency_contact_name, p.emergency_contact_phone,
  ];
  const filled = fields.filter((f) => f !== null && f !== undefined && f !== "").length;
  return Math.round((filled / fields.length) * 100);
}

function totalHours(entry: TimeEntry): number {
  if (!entry.clock_out) return 0;
  const ms = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
  return Math.max(0, Math.round(((ms / 60000 - (entry.break_minutes ?? 0)) / 60) * 100) / 100);
}

function avatarColor(name: string): string {
  const colors = [
    "bg-green-600", "bg-blue-600", "bg-purple-600", "bg-indigo-600",
    "bg-teal-600", "bg-cyan-600", "bg-rose-600", "bg-amber-600",
  ];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) ?? 0)) % colors.length;
  return colors[idx];
}

type ActiveTab = "overview" | "pay" | "hours" | "skills" | "settings";

// ── Page ──────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [savingStatus, setSavingStatus] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Current user context
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const isLocalMode = !supabase;
  const isManager = currentUserRole ? isManagerOrAbove(currentUserRole) : false;
  const isAdmin = currentUserRole ? isAdminRole(currentUserRole) : false;
  const isOwnProfile = currentUserId === employeeId;
  // Can edit: managers can edit anyone, employees can only edit their own contact info
  const canEdit = isManager || isOwnProfile;
  // Can see pay info: managers always, employee only if they're viewing their own and admin has enabled it
  const canSeePay = isManager;
  // Can change employment status / role: only managers
  const canManageEmployment = isManager;

  // PDF export
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  // ── Load user context ─────────────────────────────────────────────
  useEffect(() => {
    if (isLocalMode) {
      const session = getLocalSession();
      if (session) {
        setCurrentUserRole(normalizeRole(session.role));
        // Find this user's employee record by email
        const emps = loadLocalEmployees();
        const match = emps.find(
          (e) => e.email?.toLowerCase() === session.email.toLowerCase()
        );
        if (match) setCurrentUserId(match.id);
      }
    } else {
      supabase!.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return;
        const { data } = await supabase!
          .from("profiles")
          .select("id, role")
          .eq("auth_id", user.id)
          .single();
        if (data) {
          setCurrentUserRole(normalizeRole(data.role));
          setCurrentUserId(data.id);
        }
      });
    }
  }, [isLocalMode]);

  // ── Fetch employee data ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (isLocalMode) {
      const emps = loadLocalEmployees();
      const emp = emps.find((e) => e.id === employeeId) ?? null;
      setEmployee(emp);
      const allEntries = loadLocalEntries();
      setEntries(allEntries.filter((e) => e.user_id === employeeId));
      setLoading(false);
      return;
    }
    const [empRes, entriesRes] = await Promise.all([
      supabase!.from("profiles").select("*").eq("id", employeeId).single(),
      supabase!.from("time_entries").select("*").eq("user_id", employeeId).order("clock_in", { ascending: false }).limit(100),
    ]);
    if (empRes.data) setEmployee(empRes.data);
    if (entriesRes.data) setEntries(entriesRes.data);
    setLoading(false);
  }, [isLocalMode, employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Edit handlers ────────────────────────────────────────────────
  function startEditing() {
    if (!employee) return;
    setEditForm({
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      hire_date: employee.hire_date,
      employment_type: employee.employment_type,
      employment_status: employee.employment_status,
      default_pay_rate: employee.default_pay_rate,
      overtime_rule: employee.overtime_rule,
      address: employee.address,
      emergency_contact_name: employee.emergency_contact_name,
      emergency_contact_phone: employee.emergency_contact_phone,
      employee_notes: employee.employee_notes,
      certifications: employee.certifications,
      skill_tags: employee.skill_tags,
    });
    setIsEditing(true);
  }

  async function handleSave() {
    if (!employee) return;
    setSavingStatus(true);

    // Restrict what employees can edit on their own profile
    const allowedForSelf: (keyof Profile)[] = [
      "full_name", "email", "phone", "address",
      "emergency_contact_name", "emergency_contact_phone",
    ];
    const updates = isManager
      ? editForm
      : Object.fromEntries(
          Object.entries(editForm).filter(([k]) =>
            allowedForSelf.includes(k as keyof Profile)
          )
        );

    if (isLocalMode) {
      const emps = loadLocalEmployees();
      const updated = emps.map((e) =>
        e.id === employee.id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e
      );
      saveLocalEmployees(updated);
      setEmployee({ ...employee, ...updates } as Profile);
    } else {
      const { data } = await supabase!
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", employee.id)
        .select()
        .single();
      if (data) setEmployee(data);
    }
    setIsEditing(false);
    setSavingStatus(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  }

  // ── Derived data ─────────────────────────────────────────────────
  const completedEntries = entries.filter((e) => !!e.clock_out);
  const totalWorkedHours = completedEntries.reduce((sum, e) => sum + totalHours(e), 0);
  const completeness = employee ? calcCompleteness(employee) : 0;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEntries = completedEntries.filter((e) => new Date(e.clock_in) >= weekStart);
  const weekHours = weekEntries.reduce((sum, e) => sum + totalHours(e), 0);

  async function handleExportHoursPDF() {
    if (!employee || completedEntries.length === 0) return;
    setIsPdfExporting(true);
    try {
      const { downloadTimesheetPDF } = await import("@/lib/engines/pdf");
      const { calcDurationMinutes } = await import("@/lib/engines/time");
      const totalMins = completedEntries.reduce(
        (sum, e) => sum + calcDurationMinutes(e.clock_in, e.clock_out ?? undefined, e.break_minutes ?? 0),
        0
      );
      const otThresholdMins = (employee.overtime_threshold ?? 40) * 60;
      const regularMins = Math.min(totalMins, otThresholdMins);
      const overtimeMins = Math.max(0, totalMins - otThresholdMins);
      const sorted = [...completedEntries].sort((a, b) => a.clock_in.localeCompare(b.clock_in));
      await downloadTimesheetPDF({
        employeeName: employee.full_name,
        periodStart: sorted[0].clock_in.split("T")[0],
        periodEnd: sorted[sorted.length - 1].clock_in.split("T")[0],
        entries: completedEntries,
        regularHours: Math.round((regularMins / 60) * 100) / 100,
        overtimeHours: Math.round((overtimeMins / 60) * 100) / 100,
        payRate: employee.default_pay_rate ?? undefined,
      });
    } finally {
      setIsPdfExporting(false);
    }
  }

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500";
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

  const visibleTabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "👤" },
    ...(canSeePay || isOwnProfile ? [{ id: "pay" as ActiveTab, label: "Pay & Rates", icon: "💰" }] : []),
    { id: "hours", label: "Hours", icon: "⏱" },
    { id: "skills", label: "Skills", icon: "🏅" },
    ...(canManageEmployment ? [{ id: "settings" as ActiveTab, label: "Employment", icon: "⚙️" }] : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="text-3xl mb-2">👤</div>
          <div className="text-sm">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Employee Not Found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">This profile doesn&apos;t exist or you don&apos;t have access.</p>
        <Link href="/employees" className="text-green-700 hover:text-green-800 dark:text-green-400 text-sm font-medium">
          ← Back to Team
        </Link>
      </div>
    );
  }

  // Non-managers who are NOT viewing their own profile should only see contact card
  if (!isManager && !isOwnProfile) {
    return (
      <div className="space-y-6">
        <Link href="/employees" className="text-sm text-green-700 hover:text-green-800 dark:text-green-400 font-medium">
          ← Back to Team
        </Link>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-full ${avatarColor(employee.full_name ?? "")} text-white flex items-center justify-center text-2xl font-bold`}>
              {employee.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{employee.full_name}</h1>
              <div className="text-sm text-gray-500 dark:text-gray-400 capitalize mt-0.5">{employee.role?.replace("_", " ")}</div>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${statusBadge(employee.employment_status)}`}>
                {(employee.employment_status ?? "active").replace("_", " ")}
              </span>
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Contact Information</h3>
          <dl className="space-y-3">
            {employee.phone && (
              <div className="flex items-center gap-3">
                <span className="text-lg">📞</span>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Phone</dt>
                  <dd>
                    <a href={`tel:${employee.phone}`} className="text-sm text-gray-900 dark:text-white hover:text-green-700 dark:hover:text-green-400 font-medium transition-colors">
                      {employee.phone}
                    </a>
                  </dd>
                </div>
              </div>
            )}
            {employee.email && (
              <div className="flex items-center gap-3">
                <span className="text-lg">✉️</span>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Email</dt>
                  <dd>
                    <a href={`mailto:${employee.email}`} className="text-sm text-gray-900 dark:text-white hover:text-green-700 dark:hover:text-green-400 font-medium transition-colors">
                      {employee.email}
                    </a>
                  </dd>
                </div>
              </div>
            )}
            {!employee.phone && !employee.email && (
              <p className="text-sm text-gray-400 dark:text-gray-500">No contact information available.</p>
            )}
          </dl>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="text-xs text-blue-700 dark:text-blue-400">
            Additional profile information is only visible to managers. To update your own profile, navigate to your own employee record.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save success banner */}
      {saveSuccess && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg">
          ✓ Profile saved successfully
        </div>
      )}

      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link href="/employees" className="text-sm text-green-700 hover:text-green-800 dark:text-green-400 font-medium">
          ← Back to Team
        </Link>
        {isOwnProfile && !isManager && (
          <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-1 rounded-full font-medium">
            Your Profile
          </span>
        )}
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full ${avatarColor(employee.full_name ?? "")} text-white flex items-center justify-center text-2xl font-bold flex-shrink-0`}>
              {employee.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{employee.full_name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{employee.role?.replace("_", " ")}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(employee.employment_status)}`}>
                  {(employee.employment_status ?? "active").replace("_", " ")}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                  {employee.employment_type ?? "employee"}
                </span>
              </div>
              {isManager && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ID: {employee.id.slice(0, 12)}...
                  {employee.hire_date && ` · Hired ${new Date(employee.hire_date).toLocaleDateString()}`}
                </div>
              )}
            </div>
          </div>
          {canEdit && (
            <button
              onClick={isEditing ? handleSave : startEditing}
              disabled={savingStatus}
              className="bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors flex-shrink-0 disabled:opacity-60"
            >
              {savingStatus ? "Saving..." : isEditing ? "Save Changes" : "Edit Profile"}
            </button>
          )}
        </div>

        {/* Completeness bar — manager only */}
        {isManager && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>Profile Completeness</span>
              <span className={completeness >= 80 ? "text-green-700 dark:text-green-400 font-medium" : ""}>{completeness}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  completeness >= 80 ? "bg-green-500" : completeness >= 50 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${completeness}%` }}
              />
            </div>
            {completeness < 80 && (
              <div className="text-xs text-gray-400 mt-1">Complete the profile by adding missing contact, employment, and emergency contact details.</div>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{weekHours.toFixed(1)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">This Week hrs</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalWorkedHours.toFixed(1)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Hours</div>
        </div>
        {canSeePay ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {employee.default_pay_rate ? `$${Number(employee.default_pay_rate).toFixed(2)}` : "—"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pay Rate/hr</div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-400">—</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pay Rate</div>
          </div>
        )}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{completedEntries.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Shifts</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-green-700 text-green-700 dark:text-green-400 dark:border-green-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <span className="hidden sm:inline">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>📞</span> Contact Information
            </h3>
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <input type="text" value={editForm.full_name ?? ""} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={editForm.email ?? ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={editForm.phone ?? ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Home Address</label>
                  <input type="text" value={editForm.address ?? ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className={inputCls} />
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400 flex-shrink-0">Email</dt>
                  <dd className="text-gray-900 dark:text-white text-right">
                    {employee.email ? (
                      <a href={`mailto:${employee.email}`} className="hover:text-green-700 dark:hover:text-green-400 transition-colors">{employee.email}</a>
                    ) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400 flex-shrink-0">Phone</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {employee.phone ? (
                      <a href={`tel:${employee.phone}`} className="hover:text-green-700 dark:hover:text-green-400 transition-colors">{employee.phone}</a>
                    ) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400 flex-shrink-0">Address</dt>
                  <dd className="text-gray-900 dark:text-white text-right">{employee.address ?? "—"}</dd>
                </div>
              </dl>
            )}
          </div>

          {/* Employment Info — managers only for full details */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>💼</span> Employment Details
            </h3>
            {isEditing && isManager ? (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Hire Date</label>
                  <input type="date" value={editForm.hire_date ?? ""} onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Role</label>
                  <select value={editForm.role ?? "installer"} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className={inputCls}>
                    <option value="installer">Installer</option>
                    <option value="laborer">Laborer</option>
                    <option value="foreman">Foreman</option>
                    <option value="field_manager">Field Manager</option>
                    <option value="company_owner">Company Owner</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Employment Type</label>
                  <select value={editForm.employment_type ?? "employee"} onChange={(e) => setEditForm({ ...editForm, employment_type: e.target.value as Profile["employment_type"] })} className={inputCls}>
                    <option value="employee">Employee (W-2)</option>
                    <option value="contractor">Contractor (1099)</option>
                    <option value="temp">Temporary</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Overtime Rule</label>
                  <select value={editForm.overtime_rule ?? "standard"} onChange={(e) => setEditForm({ ...editForm, overtime_rule: e.target.value as Profile["overtime_rule"] })} className={inputCls}>
                    <option value="standard">Standard (40hr/week)</option>
                    <option value="california">California</option>
                    <option value="none">No OT</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Hire Date</dt>
                  <dd className="text-gray-900 dark:text-white">{employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Type</dt>
                  <dd className="text-gray-900 dark:text-white capitalize">{employee.employment_type ?? "employee"}</dd>
                </div>
                {isManager && (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500 dark:text-gray-400">OT Rule</dt>
                      <dd className="text-gray-900 dark:text-white capitalize">{employee.overtime_rule ?? "standard"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500 dark:text-gray-400">Profile Created</dt>
                      <dd className="text-gray-900 dark:text-white">{new Date(employee.created_at).toLocaleDateString()}</dd>
                    </div>
                  </>
                )}
              </dl>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>🚨</span> Emergency Contact
            </h3>
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Contact Name</label>
                  <input type="text" value={editForm.emergency_contact_name ?? ""} onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Contact Phone</label>
                  <input type="tel" value={editForm.emergency_contact_phone ?? ""} onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })} className={inputCls} />
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Name</dt>
                  <dd className="text-gray-900 dark:text-white">{employee.emergency_contact_name ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Phone</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {employee.emergency_contact_phone ? (
                      <a href={`tel:${employee.emergency_contact_phone}`} className="hover:text-green-700 dark:hover:text-green-400 transition-colors">
                        {employee.emergency_contact_phone}
                      </a>
                    ) : "—"}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {/* Notes — manager only */}
          {isManager && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>📝</span> Manager Notes
                <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(private)</span>
              </h3>
              {isEditing ? (
                <textarea
                  value={editForm.employee_notes ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, employee_notes: e.target.value })}
                  rows={4}
                  className={inputCls}
                  placeholder="Internal notes about this employee (not visible to them)..."
                />
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {employee.employee_notes || <span className="text-gray-400 italic">No notes.</span>}
                </p>
              )}
            </div>
          )}

          {/* Edit save/cancel buttons */}
          {isEditing && (
            <div className="lg:col-span-2 flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={savingStatus}
                className="bg-green-700 hover:bg-green-800 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
              >
                {savingStatus ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PAY & RATES TAB ── */}
      {activeTab === "pay" && (canSeePay || isOwnProfile) && (
        <div className="space-y-6">
          {/* Current Rate */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Base Pay Rate</div>
            <div className="text-5xl font-bold text-green-700 dark:text-green-400">
              {employee.default_pay_rate ? `$${Number(employee.default_pay_rate).toFixed(2)}` : "Not Set"}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">per hour</div>
            {employee.overtime_rule && employee.overtime_rule !== "none" && employee.default_pay_rate && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                OT Rate: <span className="font-semibold text-amber-600">${(Number(employee.default_pay_rate) * 1.5).toFixed(2)}/hr</span>
                {" "}({employee.overtime_rule} rule)
              </div>
            )}
          </div>

          {/* Edit pay rate — managers only */}
          {isManager && isEditing && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Edit Pay Rate</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Pay Rate ($/hr)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={editForm.default_pay_rate ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, default_pay_rate: e.target.value ? parseFloat(e.target.value) : null })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Overtime Rule</label>
                  <select value={editForm.overtime_rule ?? "standard"} onChange={(e) => setEditForm({ ...editForm, overtime_rule: e.target.value as Profile["overtime_rule"] })} className={inputCls}>
                    <option value="standard">Standard (40hr/wk)</option>
                    <option value="california">California</option>
                    <option value="none">No Overtime</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button onClick={handleSave} disabled={savingStatus} className="bg-green-700 hover:bg-green-800 text-white font-medium px-6 py-2 rounded-lg text-sm disabled:opacity-60">
                  {savingStatus ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}

          {/* Weekly Estimate */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">This Week Estimate</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{weekHours.toFixed(1)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Hours</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {Math.max(0, weekHours - 40).toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Overtime hrs</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {employee.default_pay_rate
                    ? `$${(Math.min(weekHours, 40) * Number(employee.default_pay_rate) + Math.max(0, weekHours - 40) * Number(employee.default_pay_rate) * 1.5).toFixed(2)}`
                    : "—"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Gross Est.</div>
              </div>
            </div>
          </div>

          {!canSeePay && isOwnProfile && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="text-xs text-blue-700 dark:text-blue-400">
                Pay rate details are managed by your manager. Contact them if you have questions about your compensation.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HOURS TAB ── */}
      {activeTab === "hours" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Time Entries</h3>
              {completedEntries.length > 0 && (
                <button
                  onClick={handleExportHoursPDF}
                  disabled={isPdfExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {isPdfExporting ? "Generating…" : "Export PDF"}
                </button>
              )}
            </div>
            {completedEntries.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No time entries found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Job</th>
                      <th className="pb-3 font-medium">In</th>
                      <th className="pb-3 font-medium">Out</th>
                      <th className="pb-3 font-medium">Hours</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {completedEntries.slice(0, 30).map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="py-2.5 text-gray-900 dark:text-white font-medium">
                          {new Date(entry.clock_in).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                        </td>
                        <td className="py-2.5 text-gray-600 dark:text-gray-300 max-w-[120px] truncate">{entry.job_name ?? "—"}</td>
                        <td className="py-2.5 text-gray-600 dark:text-gray-300">
                          {new Date(entry.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2.5 text-gray-600 dark:text-gray-300">
                          {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="py-2.5 font-semibold text-gray-900 dark:text-white">{totalHours(entry).toFixed(1)}h</td>
                        <td className="py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            entry.status === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                            entry.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
                            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          }`}>
                            {entry.status ?? "pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Daily hours chart */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Daily Hours — This Week</h3>
            <div className="flex items-end gap-2 h-36">
              {Array.from({ length: 7 }, (_, i) => {
                const day = new Date(weekStart);
                day.setDate(weekStart.getDate() + i);
                const dayStr = day.toISOString().split("T")[0];
                const dayEntries = completedEntries.filter((e) => e.clock_in.split("T")[0] === dayStr);
                const hrs = dayEntries.reduce((sum, e) => sum + totalHours(e), 0);
                const maxHrs = 12;
                const pct = Math.min(100, (hrs / maxHrs) * 100);
                const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const isToday = new Date().toISOString().split("T")[0] === dayStr;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 h-4">{hrs > 0 ? hrs.toFixed(1) : ""}</span>
                    <div className="w-full rounded-t overflow-hidden bg-gray-100 dark:bg-gray-700" style={{ height: "80px", position: "relative" }}>
                      <div
                        className={`absolute bottom-0 left-0 right-0 rounded-t transition-all ${hrs > 8 ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${isToday ? "text-green-700 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                      {labels[i]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500"></div> Regular</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-500"></div> Over 8hrs</div>
            </div>
          </div>
        </div>
      )}

      {/* ── SKILLS TAB ── */}
      {activeTab === "skills" && (
        <div className="space-y-6">
          {/* Certifications */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>🏅</span> Certifications
            </h3>
            {isEditing && canEdit ? (
              <div>
                <label className={labelCls}>Certifications (comma-separated)</label>
                <input
                  type="text"
                  value={Array.isArray(editForm.certifications) ? editForm.certifications.join(", ") : ""}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    certifications: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  })}
                  placeholder="OSHA 10, First Aid, CPR, Forklift License"
                  className={inputCls}
                />
                <div className="text-xs text-gray-400 mt-1">Separate multiple certifications with commas</div>
              </div>
            ) : (
              <div>
                {employee.certifications && employee.certifications.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {employee.certifications.map((cert, i) => (
                      <span key={i} className="text-sm font-medium px-3 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                        🏅 {cert}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No certifications on file.</p>
                )}
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>⭐</span> Skills & Specialties
            </h3>
            {isEditing && canEdit ? (
              <div>
                <label className={labelCls}>Skills (comma-separated)</label>
                <input
                  type="text"
                  value={Array.isArray(editForm.skill_tags) ? editForm.skill_tags.join(", ") : ""}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    skill_tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  })}
                  placeholder="Turf Install, Infill, Edging, Drainage"
                  className={inputCls}
                />
              </div>
            ) : (
              <div>
                {employee.skill_tags && employee.skill_tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {employee.skill_tags.map((skill, i) => (
                      <span key={i} className="text-sm font-medium px-3 py-1.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No skills tagged yet.</p>
                )}
              </div>
            )}
          </div>

          {/* Edit save/cancel */}
          {isEditing && canEdit && (
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleSave} disabled={savingStatus} className="bg-green-700 hover:bg-green-800 text-white font-medium px-6 py-2 rounded-lg text-sm disabled:opacity-60">
                {savingStatus ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {!canEdit && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Skills and certifications are managed by your manager. Contact them to add or update this information.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EMPLOYMENT SETTINGS TAB — managers only ── */}
      {activeTab === "settings" && canManageEmployment && (
        <div className="space-y-6">
          {/* Status Change */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Employment Status</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Current: <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${statusBadge(employee.employment_status)}`}>
                {(employee.employment_status ?? "active").replace("_", " ")}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {(["active", "probation", "on_leave", "inactive", "terminated"] as const).map((s) => (
                <button
                  key={s}
                  onClick={async () => {
                    if (s === "terminated" && !window.confirm("Are you sure you want to terminate this employee?")) return;
                    const updates: Partial<Profile> = {
                      employment_status: s,
                      is_active: s === "active" || s === "on_leave" || s === "probation",
                    };
                    if (isLocalMode) {
                      const emps = loadLocalEmployees().map((e) =>
                        e.id === employee.id ? { ...e, ...updates } : e
                      );
                      saveLocalEmployees(emps);
                      setEmployee({ ...employee, ...updates } as Profile);
                    } else {
                      const { data } = await supabase!.from("profiles").update(updates).eq("id", employee.id).select().single();
                      if (data) setEmployee(data);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border capitalize ${
                    (employee.employment_status ?? "active") === s
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  } ${s === "terminated" ? "hover:border-red-400 hover:text-red-600" : ""}`}
                >
                  {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Role & Access */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Role & System Access</h3>
            <div className="mb-4">
              <label className={labelCls}>Current Role</label>
              <select
                value={employee.role ?? "installer"}
                onChange={async (e) => {
                  const newRole = e.target.value;
                  if (isLocalMode) {
                    const emps = loadLocalEmployees().map((emp) =>
                      emp.id === employee.id ? { ...emp, role: newRole } : emp
                    );
                    saveLocalEmployees(emps);
                    setEmployee({ ...employee, role: newRole });
                  } else {
                    const { data } = await supabase!.from("profiles").update({ role: newRole }).eq("id", employee.id).select().single();
                    if (data) setEmployee(data);
                  }
                }}
                className={inputCls}
              >
                <option value="installer">Installer</option>
                <option value="laborer">Laborer</option>
                <option value="foreman">Foreman</option>
                <option value="field_manager">Field Manager</option>
                <option value="company_owner">Company Owner</option>
              </select>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Permissions for this role</div>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1.5">
                {(employee.role === "company_owner" || employee.role === "field_manager") && (
                  <>
                    <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Can create and edit jobs</li>
                    <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Can view employee profiles</li>
                    <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Can manage crew assignments</li>
                    <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Can approve time entries</li>
                  </>
                )}
                {employee.role === "company_owner" && (
                  <>
                    <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Full admin access</li>
                    <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Can manage pay rates</li>
                    <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Can view payroll</li>
                  </>
                )}
                {(employee.role === "installer" || employee.role === "laborer" || employee.role === "foreman") && (
                  <>
                    <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Can log time entries</li>
                    <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Can create journal entries</li>
                    <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Can upload files</li>
                    <li className="flex items-center gap-2"><span className="text-gray-400">✗</span> Cannot view other employees&apos; pay</li>
                    <li className="flex items-center gap-2"><span className="text-gray-400">✗</span> Cannot approve time entries</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Delete */}
          {isAdmin && (
            <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl p-5">
              <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Permanently delete this employee profile. This cannot be undone.
                All time entries and records associated with this employee will remain, but the profile will be removed.
              </p>
              <button
                onClick={async () => {
                  if (!window.confirm(`Delete ${employee.full_name}'s profile permanently?`)) return;
                  if (!window.confirm("This CANNOT be undone. Confirm?")) return;
                  if (isLocalMode) {
                    const emps = loadLocalEmployees().filter((e) => e.id !== employee.id);
                    saveLocalEmployees(emps);
                  } else {
                    await supabase!.from("profiles").delete().eq("id", employee.id);
                  }
                  router.push("/employees");
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Delete Profile
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
