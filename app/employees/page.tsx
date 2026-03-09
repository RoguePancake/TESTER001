"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase, type Profile } from "@/lib/supabase";

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

// ── Status badge colors ──────────────────────────────────────────────────
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

function typeBadge(type?: string) {
  switch (type) {
    case "contractor": return "bg-orange-100 text-orange-800";
    case "temp": return "bg-purple-100 text-purple-800";
    default: return "bg-blue-100 text-blue-800";
  }
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState("installer");
  const [newType, setNewType] = useState<"employee" | "contractor">("employee");
  const [newRate, setNewRate] = useState("");

  const isLocal = !supabase;

  const fetchEmployees = useCallback(async () => {
    if (isLocal) {
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
  }, [isLocal]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ── Add Employee ────────────────────────────────────────────────────
  function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    const newEmp: Profile = {
      id: `emp-${Date.now()}`,
      full_name: newName.trim(),
      email: newEmail.trim() || null,
      phone: newPhone.trim() || null,
      role: newRole,
      is_active: true,
      employment_status: "active",
      employment_type: newType,
      default_pay_rate: newRate ? parseFloat(newRate) : null,
      hire_date: new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
    };

    if (isLocal) {
      const updated = [...employees, newEmp];
      setEmployees(updated);
      saveLocalEmployees(updated);
    }

    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewRole("installer");
    setNewType("employee");
    setNewRate("");
    setShowAddForm(false);
  }

  // ── Filtering ──────────────────────────────────────────────────────
  const filtered = employees.filter((emp) => {
    if (search) {
      const q = search.toLowerCase();
      const match = emp.full_name?.toLowerCase().includes(q)
        || emp.email?.toLowerCase().includes(q)
        || emp.phone?.includes(q);
      if (!match) return false;
    }
    if (filterStatus && (emp.employment_status ?? "active") !== filterStatus) return false;
    if (filterType && (emp.employment_type ?? "employee") !== filterType) return false;
    if (filterRole && emp.role !== filterRole) return false;
    return true;
  });

  // ── Stats ──────────────────────────────────────────────────────────
  const stats = {
    total: employees.length,
    active: employees.filter((e) => (e.employment_status ?? "active") === "active").length,
    onLeave: employees.filter((e) => e.employment_status === "on_leave").length,
    contractors: employees.filter((e) => e.employment_type === "contractor").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading Employees...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Employees
        </h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {showAddForm ? "Cancel" : "+ Add Employee"}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-green-700">{stats.active}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Active</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">{stats.onLeave}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">On Leave</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-orange-600">{stats.contractors}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Contractors</div>
        </div>
      </div>

      {/* Add Employee Form */}
      {showAddForm && (
        <form onSubmit={handleAddEmployee} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-green-800 dark:text-green-300">New Employee</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-green-800 dark:text-green-300 mb-1">Full Name *</label>
              <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="John Smith" className="w-full border border-green-300 dark:border-green-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-green-800 dark:text-green-300 mb-1">Email</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="john@company.com" className="w-full border border-green-300 dark:border-green-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-green-800 dark:text-green-300 mb-1">Phone</label>
              <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                placeholder="(555) 123-4567" className="w-full border border-green-300 dark:border-green-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-green-800 dark:text-green-300 mb-1">Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                className="w-full border border-green-300 dark:border-green-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="installer">Installer</option>
                <option value="laborer">Laborer</option>
                <option value="field_manager">Field Manager</option>
                <option value="foreman">Foreman</option>
                <option value="company_owner">Company Owner</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-green-800 dark:text-green-300 mb-1">Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as "employee" | "contractor")}
                className="w-full border border-green-300 dark:border-green-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="employee">Employee (W-2)</option>
                <option value="contractor">Contractor (1099)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-green-800 dark:text-green-300 mb-1">Pay Rate ($/hr)</label>
              <input type="number" step="0.01" min="0" value={newRate} onChange={(e) => setNewRate(e.target.value)}
                placeholder="25.00" className="w-full border border-green-300 dark:border-green-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-green-700 hover:bg-green-800 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors">
              Add Employee
            </button>
          </div>
        </form>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">All Types</option>
            <option value="employee">Employee</option>
            <option value="contractor">Contractor</option>
          </select>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">All Roles</option>
            <option value="installer">Installer</option>
            <option value="laborer">Laborer</option>
            <option value="field_manager">Field Manager</option>
            <option value="foreman">Foreman</option>
            <option value="company_owner">Owner</option>
          </select>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Employee</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden sm:table-cell">Role</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden md:table-cell">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden md:table-cell">Type</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden lg:table-cell">Pay Rate</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden lg:table-cell">Phone</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    {search || filterStatus || filterType || filterRole
                      ? "No employees match your filters."
                      : "No employees yet. Add your first employee above."}
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {emp.full_name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{emp.full_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{emp.email ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs capitalize">{emp.role?.replace("_", " ") ?? "—"}</span>
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
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {emp.default_pay_rate ? `$${Number(emp.default_pay_rate).toFixed(2)}/hr` : "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                      {emp.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/employees/${emp.id}`}
                        className="text-green-700 hover:text-green-800 dark:text-green-400 text-xs font-medium"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          Showing {filtered.length} of {employees.length} employees
        </div>
      </div>
    </div>
  );
}
