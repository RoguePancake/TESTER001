"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase, type Profile } from "@/lib/supabase";
import { getLocalSession } from "@/lib/local-auth";
import { normalizeRole, isManagerOrAbove, isAdminRole } from "@/lib/engines/permissions";
import type { UserRole } from "@/lib/engines/permissions";

// ── localStorage keys ────────────────────────────────────────────────────
const LS_EMPLOYEES = "jobsite_employees";

function loadLocalEmployees(): Profile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_EMPLOYEES);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }
  const defaults: Profile[] = [
    {
      id: "emp-1", full_name: "Alex Rivera", email: "alex@example.com", role: "installer",
      is_active: true, employment_status: "active", employment_type: "employee",
      phone: "(555) 123-4567", hire_date: "2024-03-15", default_pay_rate: 28,
      created_at: new Date().toISOString(),
    },
    {
      id: "emp-2", full_name: "Sam Brooks", email: "sam@example.com", role: "installer",
      is_active: true, employment_status: "active", employment_type: "employee",
      phone: "(555) 987-6543", hire_date: "2024-06-01", default_pay_rate: 25,
      created_at: new Date().toISOString(),
    },
    {
      id: "emp-3", full_name: "Jordan Lee", email: "jordan@example.com", role: "field_manager",
      is_active: true, employment_status: "active", employment_type: "employee",
      phone: "(555) 456-7890", hire_date: "2023-11-10", default_pay_rate: 35,
      created_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(LS_EMPLOYEES, JSON.stringify(defaults));
  return defaults;
}

function saveLocalEmployees(employees: Profile[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_EMPLOYEES, JSON.stringify(employees));
  }
}

// ── Badge helpers ────────────────────────────────────────────────────────
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

function typeBadge(type?: string) {
  switch (type) {
    case "contractor": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "temp": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    default: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  }
}

function roleBadgeColor(role?: string) {
  switch (role) {
    case "field_manager": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
    case "foreman": return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300";
    case "company_owner": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  }
}

function avatarColor(name: string): string {
  const colors = [
    "bg-green-600", "bg-blue-600", "bg-purple-600", "bg-indigo-600",
    "bg-teal-600", "bg-cyan-600", "bg-rose-600", "bg-amber-600",
  ];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) ?? 0)) % colors.length;
  return colors[idx];
}

// ── Add Employee Form ─────────────────────────────────────────────────────
interface AddEmployeeFormProps {
  onAdd: (emp: Profile) => void;
  onCancel: () => void;
}

function AddEmployeeForm({ onAdd, onCancel }: AddEmployeeFormProps) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "installer",
    employment_type: "employee" as "employee" | "contractor",
    employment_status: "active" as Profile["employment_status"],
    default_pay_rate: "",
    hire_date: new Date().toISOString().split("T")[0],
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    certifications: "",
    skill_tags: "",
    employee_notes: "",
    overtime_rule: "standard" as Profile["overtime_rule"],
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    const newEmp: Profile = {
      id: `emp-${Date.now()}`,
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role: form.role,
      is_active: form.employment_status === "active" || form.employment_status === "on_leave",
      employment_status: form.employment_status,
      employment_type: form.employment_type,
      default_pay_rate: form.default_pay_rate ? parseFloat(form.default_pay_rate) : null,
      hire_date: form.hire_date || new Date().toISOString().split("T")[0],
      address: form.address.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      certifications: form.certifications ? form.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [],
      skill_tags: form.skill_tags ? form.skill_tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
      employee_notes: form.employee_notes.trim() || null,
      overtime_rule: form.overtime_rule,
      created_at: new Date().toISOString(),
    };
    onAdd(newEmp);
  }

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500";
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-green-800 dark:text-green-300 text-base">➕ New Employee Profile</h3>
        <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400">Cancel</button>
      </div>

      {/* Basic Info */}
      <div>
        <div className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-3">Basic Information</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Full Name *</label>
            <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="John Smith" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@company.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 123-4567" className={inputCls} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelCls}>Address</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Main St, City, State" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Employment Info */}
      <div>
        <div className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-3">Employment Details</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Role / Position</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
              <option value="installer">Installer</option>
              <option value="laborer">Laborer</option>
              <option value="foreman">Foreman</option>
              <option value="field_manager">Field Manager</option>
              <option value="company_owner">Company Owner</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Employment Type</label>
            <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value as "employee" | "contractor" })} className={inputCls}>
              <option value="employee">Employee (W-2)</option>
              <option value="contractor">Contractor (1099)</option>
              <option value="temp">Temporary / Seasonal</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.employment_status ?? "active"} onChange={(e) => setForm({ ...form, employment_status: e.target.value as Profile["employment_status"] })} className={inputCls}>
              <option value="active">Active</option>
              <option value="probation">Probation</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Hire Date</label>
            <input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Pay Rate ($/hr)</label>
            <input type="number" step="0.01" min="0" value={form.default_pay_rate} onChange={(e) => setForm({ ...form, default_pay_rate: e.target.value })}
              placeholder="25.00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Overtime Rule</label>
            <select value={form.overtime_rule ?? "standard"} onChange={(e) => setForm({ ...form, overtime_rule: e.target.value as Profile["overtime_rule"] })} className={inputCls}>
              <option value="standard">Standard (40hr/wk)</option>
              <option value="california">California</option>
              <option value="none">No OT</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div>
        <div className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-3">Emergency Contact</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Contact Name</label>
            <input type="text" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
              placeholder="Jane Smith" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact Phone</label>
            <input type="tel" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
              placeholder="(555) 000-0000" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Skills & Certs */}
      <div>
        <div className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-3">Skills & Certifications</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Certifications (comma-separated)</label>
            <input type="text" value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })}
              placeholder="OSHA 10, First Aid, Forklift" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Skills / Tags (comma-separated)</label>
            <input type="text" value={form.skill_tags} onChange={(e) => setForm({ ...form, skill_tags: e.target.value })}
              placeholder="Turf install, Infill, Edging" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>Manager Notes</label>
        <textarea
          value={form.employee_notes}
          onChange={(e) => setForm({ ...form, employee_notes: e.target.value })}
          rows={3}
          placeholder="Internal notes about this employee..."
          className={inputCls}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Cancel
        </button>
        <button type="submit"
          className="bg-green-700 hover:bg-green-800 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors">
          Add Employee
        </button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeView, setActiveView] = useState<"directory" | "roster">("directory");

  const isLocalMode = !supabase;
  const isManager = currentUserRole ? isManagerOrAbove(currentUserRole) : false;
  const isAdmin = currentUserRole ? isAdminRole(currentUserRole) : false;

  // ── Load user context ─────────────────────────────────────────────
  useEffect(() => {
    if (isLocalMode) {
      const session = getLocalSession();
      if (session) {
        const role = normalizeRole(session.role);
        setCurrentUserRole(role);
        setCurrentUserEmail(session.email);
        // Find corresponding employee record
        const emps = loadLocalEmployees();
        const match = emps.find(
          (e) => e.email?.toLowerCase() === session.email.toLowerCase()
        );
        if (match) setCurrentEmployeeId(match.id);
      }
    } else {
      supabase!.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return;
        const { data } = await supabase!
          .from("profiles")
          .select("id, role, email")
          .eq("auth_id", user.id)
          .single();
        if (data) {
          setCurrentUserRole(normalizeRole(data.role));
          setCurrentUserEmail(data.email ?? "");
          setCurrentEmployeeId(data.id);
        }
      });
    }
  }, [isLocalMode]);

  // ── Fetch employees ──────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    if (isLocalMode) {
      setEmployees(loadLocalEmployees());
      setLoading(false);
      return;
    }
    const { data } = await supabase!
      .from("profiles")
      .select("*")
      .order("full_name");
    if (data) setEmployees(data);
    setLoading(false);
  }, [isLocalMode]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ── Add Employee ─────────────────────────────────────────────────
  function handleAddEmployee(newEmp: Profile) {
    if (isLocalMode) {
      const updated = [...employees, newEmp];
      setEmployees(updated);
      saveLocalEmployees(updated);
    }
    setShowAddForm(false);
  }

  // ── Filtering ────────────────────────────────────────────────────
  const filtered = employees.filter((emp) => {
    if (search) {
      const q = search.toLowerCase();
      const match = emp.full_name?.toLowerCase().includes(q)
        || emp.email?.toLowerCase().includes(q)
        || emp.phone?.includes(q)
        || emp.role?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterStatus && (emp.employment_status ?? "active") !== filterStatus) return false;
    if (filterType && (emp.employment_type ?? "employee") !== filterType) return false;
    if (filterRole && emp.role !== filterRole) return false;
    return true;
  });

  // ── Stats (managers only) ────────────────────────────────────────
  const stats = {
    total: employees.length,
    active: employees.filter((e) => (e.employment_status ?? "active") === "active").length,
    onLeave: employees.filter((e) => e.employment_status === "on_leave").length,
    contractors: employees.filter((e) => e.employment_type === "contractor").length,
    avgPay: (() => {
      const withPay = employees.filter((e) => e.default_pay_rate);
      if (!withPay.length) return null;
      return withPay.reduce((sum, e) => sum + Number(e.default_pay_rate), 0) / withPay.length;
    })(),
  };

  const myProfile = employees.find((e) => e.id === currentEmployeeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-sm">Loading team...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isManager ? "Team Management" : "Team Directory"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isManager
              ? "Manage employee profiles, pay, and assignments"
              : "View your team's contact information"}
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors flex-shrink-0"
          >
            {showAddForm ? "Cancel" : "+ Add Employee"}
          </button>
        )}
      </div>

      {/* My Profile Card — shown for non-managers who have a profile */}
      {!isManager && myProfile && (
        <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${avatarColor(myProfile.full_name ?? "")} text-white flex items-center justify-center text-lg font-bold`}>
                {myProfile.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-white">{myProfile.full_name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 capitalize">{myProfile.role?.replace("_", " ")}</div>
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${statusBadge(myProfile.employment_status)}`}>
                  {(myProfile.employment_status ?? "active").replace("_", " ")}
                </span>
              </div>
            </div>
            <Link
              href={`/employees/${myProfile.id}`}
              className="bg-green-700 hover:bg-green-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              My Profile
            </Link>
          </div>
        </div>
      )}

      {/* Stats — managers only */}
      {isManager && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Team</div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.active}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Active</div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.onLeave}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">On Leave</div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.contractors}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Contractors</div>
          </div>
        </div>
      )}

      {/* Add Employee Form */}
      {showAddForm && isManager && (
        <AddEmployeeForm
          onAdd={handleAddEmployee}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* View Toggle (managers) */}
      {isManager && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView("directory")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === "directory"
                ? "bg-green-700 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            📋 Directory View
          </button>
          <button
            onClick={() => setActiveView("roster")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === "roster"
                ? "bg-green-700 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            📊 Roster View
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search by name, email, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="lg:col-span-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {isManager && (
            <>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="probation">Probation</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">All Roles</option>
                <option value="installer">Installer</option>
                <option value="laborer">Laborer</option>
                <option value="foreman">Foreman</option>
                <option value="field_manager">Field Manager</option>
                <option value="company_owner">Owner</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* ── DIRECTORY VIEW (Card Grid) — non-managers + default for managers ── */}
      {(!isManager || activeView === "directory") && (
        <div>
          {/* Employee section label */}
          {!isManager && (
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
              Team Contact Directory ({filtered.filter(e => (e.employment_status ?? "active") === "active").length} active)
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                {search ? "No team members match your search." : "No team members found."}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((emp) => {
                const isMe = emp.id === currentEmployeeId;
                const canViewFull = isManager || isMe;

                return (
                  <div
                    key={emp.id}
                    className={`bg-white dark:bg-gray-800 border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${
                      isMe ? "border-green-400 dark:border-green-600" : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-full ${avatarColor(emp.full_name ?? "")} text-white flex items-center justify-center text-base font-bold flex-shrink-0`}>
                        {emp.full_name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">{emp.full_name}</div>
                          {isMe && <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">{emp.role?.replace("_", " ")}</div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${statusBadge(emp.employment_status)}`}>
                            {(emp.employment_status ?? "active").replace("_", " ")}
                          </span>
                          {isManager && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${typeBadge(emp.employment_type)}`}>
                              {emp.employment_type ?? "employee"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact info — always visible for team directory */}
                    <div className="mt-3 space-y-1.5 border-t border-gray-100 dark:border-gray-700 pt-3">
                      {emp.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <span className="text-gray-400">📞</span>
                          <a href={`tel:${emp.phone}`} className="hover:text-green-700 dark:hover:text-green-400 transition-colors">
                            {emp.phone}
                          </a>
                        </div>
                      )}
                      {emp.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <span className="text-gray-400">✉️</span>
                          <a href={`mailto:${emp.email}`} className="hover:text-green-700 dark:hover:text-green-400 transition-colors truncate">
                            {emp.email}
                          </a>
                        </div>
                      )}
                      {/* Pay rate — only for managers or self (if enabled by admin) */}
                      {isManager && emp.default_pay_rate && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <span className="text-gray-400">💰</span>
                          <span>${Number(emp.default_pay_rate).toFixed(2)}/hr</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center justify-between">
                      {emp.hire_date && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Since {new Date(emp.hire_date).toLocaleDateString([], { month: "short", year: "numeric" })}
                        </div>
                      )}
                      {canViewFull && (
                        <Link
                          href={`/employees/${emp.id}`}
                          className="text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-xs font-semibold transition-colors"
                        >
                          {isMe ? "My Profile →" : "View →"}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ROSTER VIEW (Table) — managers only ── */}
      {isManager && activeView === "roster" && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Employee</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden sm:table-cell">Role</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden md:table-cell">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden md:table-cell">Type</th>
                  {isAdmin && <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden lg:table-cell">Pay Rate</th>}
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden lg:table-cell">Phone</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden xl:table-cell">Hire Date</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No employees match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${avatarColor(emp.full_name ?? "")} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                            {emp.full_name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                              {emp.full_name}
                              {emp.id === currentEmployeeId && (
                                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.5 rounded-full">you</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{emp.email ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${roleBadgeColor(emp.role)}`}>
                          {emp.role?.replace("_", " ") ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(emp.employment_status)}`}>
                          {(emp.employment_status ?? "active").replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge(emp.employment_type)}`}>
                          {emp.employment_type ?? "employee"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 hidden lg:table-cell text-sm font-medium text-gray-900 dark:text-white">
                          {emp.default_pay_rate ? `$${Number(emp.default_pay_rate).toFixed(2)}/hr` : "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500 dark:text-gray-400">
                        {emp.phone ? (
                          <a href={`tel:${emp.phone}`} className="hover:text-green-700 transition-colors">{emp.phone}</a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-xs text-gray-500 dark:text-gray-400">
                        {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/employees/${emp.id}`}
                          className="text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-xs font-medium transition-colors"
                        >
                          Profile →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Showing {filtered.length} of {employees.length} employees</span>
            {stats.avgPay && isAdmin && (
              <span>Team avg pay: ${stats.avgPay.toFixed(2)}/hr</span>
            )}
          </div>
        </div>
      )}

      {/* Employee access note */}
      {!isManager && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex gap-3 items-start">
            <span className="text-blue-600 text-base">ℹ️</span>
            <div>
              <div className="text-sm font-medium text-blue-800 dark:text-blue-300">Team Directory</div>
              <div className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                You can see contact information for all team members. To update your personal information, visit your own profile.
                Only managers and administrators can edit other employee profiles or view pay information.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
