"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, type Profile, type TimeEntry } from "@/lib/supabase";

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
    case "active": return "bg-green-100 text-green-800";
    case "on_leave": return "bg-yellow-100 text-yellow-800";
    case "inactive": return "bg-gray-100 text-gray-600";
    case "terminated": return "bg-red-100 text-red-800";
    case "probation": return "bg-orange-100 text-orange-800";
    default: return "bg-green-100 text-green-800";
  }
}

function calcCompleteness(p: Profile): number {
  const fields = [p.full_name, p.email, p.phone, p.role, p.hire_date, p.employment_type, p.default_pay_rate, p.address, p.emergency_contact_name, p.emergency_contact_phone];
  const filled = fields.filter((f) => f !== null && f !== undefined && f !== "").length;
  return Math.round((filled / fields.length) * 100);
}

function totalHours(entry: TimeEntry): number {
  if (!entry.clock_out) return 0;
  const ms = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
  return Math.max(0, Math.round(((ms / 60000 - entry.break_minutes) / 60) * 100) / 100);
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "pay" | "hours" | "settings">("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});

  const isLocal = !supabase;

  const fetchData = useCallback(async () => {
    if (isLocal) {
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
  }, [isLocal, employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Edit handlers ──────────────────────────────────────────────────
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
    });
    setIsEditing(true);
  }

  async function handleSave() {
    if (!employee) return;

    if (isLocal) {
      const emps = loadLocalEmployees();
      const updated = emps.map((e) =>
        e.id === employee.id ? { ...e, ...editForm, updated_at: new Date().toISOString() } : e
      );
      saveLocalEmployees(updated);
      setEmployee({ ...employee, ...editForm } as Profile);
    } else {
      const { data } = await supabase!
        .from("profiles")
        .update({ ...editForm, updated_at: new Date().toISOString() })
        .eq("id", employee.id)
        .select()
        .single();
      if (data) setEmployee(data);
    }
    setIsEditing(false);
  }

  // ── Derived data ──────────────────────────────────────────────────
  const completedEntries = entries.filter((e) => !!e.clock_out);
  const totalWorkedHours = completedEntries.reduce((sum, e) => sum + totalHours(e), 0);
  const completeness = employee ? calcCompleteness(employee) : 0;

  // Weekly hours
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEntries = completedEntries.filter((e) => new Date(e.clock_in) >= weekStart);
  const weekHours = weekEntries.reduce((sum, e) => sum + totalHours(e), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading employee...</div>;
  }

  if (!employee) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Employee Not Found</h2>
        <Link href="/employees" className="text-green-700 hover:text-green-800 text-sm font-medium">
          Back to Employees
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/employees" className="text-sm text-green-700 hover:text-green-800 dark:text-green-400 font-medium">
        &larr; Back to Employees
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-600 text-white flex items-center justify-center text-xl font-bold">
              {employee.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{employee.full_name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{employee.role?.replace("_", " ")}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(employee.employment_status)}`}>
                  {(employee.employment_status ?? "active").replace("_", " ")}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {employee.employment_type ?? "employee"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={isEditing ? handleSave : startEditing}
            className="bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {isEditing ? "Save Changes" : "Edit Profile"}
          </button>
        </div>

        {/* Completeness bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Profile Completeness</span>
            <span>{completeness}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${completeness >= 80 ? "bg-green-500" : completeness >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{weekHours.toFixed(1)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">This Week</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalWorkedHours.toFixed(1)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Hours</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700">
            {employee.default_pay_rate ? `$${Number(employee.default_pay_rate).toFixed(2)}` : "—"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Pay Rate/hr</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{completedEntries.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Shifts</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(["overview", "pay", "hours", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? "border-green-700 text-green-700 dark:text-green-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {tab === "pay" ? "Pay & Rates" : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                  <input type="text" value={editForm.full_name ?? ""} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input type="email" value={editForm.email ?? ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input type="tel" value={editForm.phone ?? ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                  <input type="text" value={editForm.address ?? ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Email</dt><dd className="text-gray-900 dark:text-white">{employee.email ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Phone</dt><dd className="text-gray-900 dark:text-white">{employee.phone ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Address</dt><dd className="text-gray-900 dark:text-white">{employee.address ?? "—"}</dd></div>
              </dl>
            )}
          </div>

          {/* Employment Info */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Employment Details</h3>
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hire Date</label>
                  <input type="date" value={editForm.hire_date ?? ""} onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                  <select value={editForm.role ?? "employee"} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="installer">Installer</option>
                    <option value="laborer">Laborer</option>
                    <option value="field_manager">Field Manager</option>
                    <option value="foreman">Foreman</option>
                    <option value="company_owner">Company Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Employment Type</label>
                  <select value={editForm.employment_type ?? "employee"} onChange={(e) => setEditForm({ ...editForm, employment_type: e.target.value as Profile["employment_type"] })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="employee">Employee (W-2)</option>
                    <option value="contractor">Contractor (1099)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Overtime Rule</label>
                  <select value={editForm.overtime_rule ?? "standard"} onChange={(e) => setEditForm({ ...editForm, overtime_rule: e.target.value as Profile["overtime_rule"] })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="standard">Standard (40hr/week)</option>
                    <option value="california">California</option>
                    <option value="none">No OT</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Hire Date</dt><dd className="text-gray-900 dark:text-white">{employee.hire_date ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Type</dt><dd className="text-gray-900 dark:text-white capitalize">{employee.employment_type ?? "employee"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">OT Rule</dt><dd className="text-gray-900 dark:text-white capitalize">{employee.overtime_rule ?? "standard"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Created</dt><dd className="text-gray-900 dark:text-white">{new Date(employee.created_at).toLocaleDateString()}</dd></div>
              </dl>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Emergency Contact</h3>
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Contact Name</label>
                  <input type="text" value={editForm.emergency_contact_name ?? ""} onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Contact Phone</label>
                  <input type="tel" value={editForm.emergency_contact_phone ?? ""} onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Name</dt><dd className="text-gray-900 dark:text-white">{employee.emergency_contact_name ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Phone</dt><dd className="text-gray-900 dark:text-white">{employee.emergency_contact_phone ?? "—"}</dd></div>
              </dl>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Notes</h3>
            {isEditing ? (
              <textarea
                value={editForm.employee_notes ?? ""}
                onChange={(e) => setEditForm({ ...editForm, employee_notes: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Employee notes..."
              />
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {employee.employee_notes ?? "No notes."}
              </p>
            )}
          </div>

          {isEditing && (
            <div className="lg:col-span-2 flex justify-end gap-3">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} className="bg-green-700 hover:bg-green-800 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors">
                Save Changes
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "pay" && (
        <div className="space-y-6">
          {/* Current Rate */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Pay Rate</div>
            <div className="text-4xl font-bold text-green-700">
              {employee.default_pay_rate ? `$${Number(employee.default_pay_rate).toFixed(2)}` : "Not Set"}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">per hour</div>
            {employee.overtime_rule && employee.overtime_rule !== "none" && (
              <div className="text-sm text-gray-500 mt-2">
                OT Rate: ${employee.default_pay_rate ? (Number(employee.default_pay_rate) * 1.5).toFixed(2) : "—"}/hr ({employee.overtime_rule} rule)
              </div>
            )}
          </div>

          {/* Estimated Pay This Week */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">This Week Estimate</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{weekHours.toFixed(1)}h</div>
                <div className="text-xs text-gray-500">Hours</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {Math.max(0, weekHours - 40).toFixed(1)}h
                </div>
                <div className="text-xs text-gray-500">Overtime</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-700">
                  {employee.default_pay_rate
                    ? `$${(Math.min(weekHours, 40) * Number(employee.default_pay_rate) + Math.max(0, weekHours - 40) * Number(employee.default_pay_rate) * 1.5).toFixed(2)}`
                    : "—"}
                </div>
                <div className="text-xs text-gray-500">Gross Est.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "hours" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Time Entries</h3>
            {completedEntries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No time entries found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Job</th>
                      <th className="pb-2 font-medium">In</th>
                      <th className="pb-2 font-medium">Out</th>
                      <th className="pb-2 font-medium">Hours</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {completedEntries.slice(0, 25).map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-2 text-gray-900 dark:text-white">
                          {new Date(entry.clock_in).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </td>
                        <td className="py-2 text-gray-600 dark:text-gray-300">{entry.job_name ?? "—"}</td>
                        <td className="py-2 text-gray-600 dark:text-gray-300">
                          {new Date(entry.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2 text-gray-600 dark:text-gray-300">
                          {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="py-2 font-medium text-gray-900 dark:text-white">{totalHours(entry).toFixed(1)}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            entry.status === "approved" ? "bg-green-100 text-green-800" :
                            entry.status === "rejected" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
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

          {/* Simple hours chart */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Daily Hours (This Week)</h3>
            <div className="flex items-end gap-2 h-32">
              {Array.from({ length: 7 }, (_, i) => {
                const day = new Date(weekStart);
                day.setDate(weekStart.getDate() + i);
                const dayStr = day.toISOString().split("T")[0];
                const dayEntries = completedEntries.filter((e) => e.clock_in.split("T")[0] === dayStr);
                const hrs = dayEntries.reduce((sum, e) => sum + totalHours(e), 0);
                const maxHrs = 12;
                const pct = Math.min(100, (hrs / maxHrs) * 100);
                const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{hrs > 0 ? hrs.toFixed(1) : ""}</span>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-t" style={{ height: "80px", position: "relative" }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t transition-all"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{labels[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Status Change */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Employment Status</h3>
            <div className="flex flex-wrap gap-2">
              {(["active", "on_leave", "inactive", "terminated"] as const).map((s) => (
                <button
                  key={s}
                  onClick={async () => {
                    if (s === "terminated" && !window.confirm("Are you sure you want to terminate this employee? This will deactivate their account.")) return;
                    const updates: Partial<Profile> = {
                      employment_status: s,
                      is_active: s === "active" || s === "on_leave",
                    };
                    if (isLocal) {
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    (employee.employment_status ?? "active") === s
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions summary */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Role Permissions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Current role: <span className="font-medium capitalize">{employee.role?.replace("_", " ")}</span>
            </p>
            <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              {employee.role === "company_owner" && <li>Full admin access to all features</li>}
              {employee.role === "field_manager" && (
                <>
                  <li>Can create and edit jobs</li>
                  <li>Can view employees and approve time</li>
                  <li>Can manage crews</li>
                </>
              )}
              {(employee.role === "installer" || employee.role === "laborer" || employee.role === "employee") && (
                <>
                  <li>Can log time entries</li>
                  <li>Can create journal entries</li>
                  <li>Can upload files</li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
