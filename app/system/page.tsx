"use client";

import Link from "next/link";

const APP_INFO = {
  product: "InstallOperations",
  shortName: "IO",
  company: "Pro-Grade Artificial Turf",
  version: "0.1.0-alpha",
  buildDate: "2026-03-09",
  environment: process.env.NODE_ENV ?? "development",
  contact: {
    email: "support@progradeturf.com",
    website: "https://progradeturf.com",
  },
  stack: [
    { name: "Next.js 15", desc: "React framework (App Router)" },
    { name: "TypeScript", desc: "Type-safe development" },
    { name: "Supabase", desc: "Database, auth, and storage" },
    { name: "Tailwind CSS", desc: "Utility-first styling" },
    { name: "Vercel", desc: "Deployment platform" },
  ],
  modules: [
    { name: "Identity System", icon: "👤", status: "active", desc: "Employee profiles, roles, and permissions" },
    { name: "Job System", icon: "📋", status: "active", desc: "Jobsite management, assignments, and tracking" },
    { name: "Time & Payroll", icon: "⏱", status: "active", desc: "Clock in/out, timesheets, payroll generation" },
    { name: "Materials & Logistics", icon: "📦", status: "planned", desc: "Material tracking, deliveries, inventory" },
    { name: "Intelligence System", icon: "📊", status: "active", desc: "Analytics, reports, and operational insights" },
    { name: "Employee Management", icon: "👥", status: "active", desc: "Employee CRUD, pay rates, job assignments" },
    { name: "Crew Management", icon: "🏗", status: "active", desc: "Crew organization and member management" },
    { name: "Journal & Notes", icon: "📝", status: "active", desc: "Field notes, daily logs, and observations" },
    { name: "File Management", icon: "📎", status: "active", desc: "Document and photo uploads" },
    { name: "Notifications", icon: "🔔", status: "active", desc: "In-app alerts and activity notifications" },
    { name: "Automation", icon: "⚡", status: "beta", desc: "Workflow automation and triggers" },
    { name: "AI Assistant", icon: "🤖", status: "beta", desc: "AI-powered jobsite intelligence" },
  ],
};

function statusColor(status: string) {
  switch (status) {
    case "active": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "beta": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "planned": return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    default: return "bg-gray-100 text-gray-600";
  }
}

export default function SystemInfoPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-700 text-white text-2xl font-black mb-4 shadow-lg">
          IO
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {APP_INFO.product}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          by {APP_INFO.company}
        </p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
            v{APP_INFO.version}
          </span>
          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full font-medium">
            {APP_INFO.environment}
          </span>
        </div>
      </div>

      {/* About */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">About InstallOperations</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          InstallOperations (IO) is a jobsite operations platform designed for installation crews
          and field-based construction companies. Built by Pro-Grade Artificial Turf to manage
          real-world artificial turf installation projects, IO serves as a complete Jobsite
          Operating System that handles employee management, job tracking, time and payroll,
          materials logistics, and operational intelligence.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
          The platform is being built internally by a real installation company and tested in
          active field operations, giving the software a strong focus on real-world contractor workflows.
        </p>
      </div>

      {/* Contact */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Contact & Support</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Company</dt>
            <dd className="text-gray-900 dark:text-white font-medium">{APP_INFO.company}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Email</dt>
            <dd>
              <a href={`mailto:${APP_INFO.contact.email}`} className="text-green-700 dark:text-green-400 hover:underline">
                {APP_INFO.contact.email}
              </a>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Website</dt>
            <dd>
              <a href={APP_INFO.contact.website} target="_blank" rel="noopener noreferrer" className="text-green-700 dark:text-green-400 hover:underline">
                progradeturf.com
              </a>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Build Date</dt>
            <dd className="text-gray-900 dark:text-white">{APP_INFO.buildDate}</dd>
          </div>
        </dl>
      </div>

      {/* System Modules */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">System Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {APP_INFO.modules.map((mod) => (
            <div key={mod.name} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
              <span className="text-xl">{mod.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{mod.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColor(mod.status)}`}>
                    {mod.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{mod.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Tech Stack</h2>
        <div className="space-y-2">
          {APP_INFO.stack.map((tech) => (
            <div key={tech.name} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <span className="font-medium text-gray-900 dark:text-white">{tech.name}</span>
              <span className="text-gray-500 dark:text-gray-400">{tech.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Architecture</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          IO is built on a modular engine architecture. Each system module has a dedicated
          engine file ({`lib/engines/*.ts`}) that handles data access, business logic, and
          type definitions. The API layer uses Next.js server-side routes with Supabase
          service role authentication. The UI layer consists of client-side React components
          with dual-mode support (Supabase cloud and localStorage offline mode).
        </p>
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg text-xs font-mono text-gray-600 dark:text-gray-400 space-y-1">
          <div>lib/engines/ ........... Data engines (12 modules)</div>
          <div>app/api/ ............... Server-side API routes</div>
          <div>app/*/page.tsx ......... Client-side UI pages</div>
          <div>supabase/migrations/ ... Database schema</div>
          <div>lib/supabase.ts ........ Shared types & client</div>
        </div>
      </div>

      {/* Legal */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
        <p>&copy; {new Date().getFullYear()} {APP_INFO.company}. All rights reserved.</p>
        <p className="mt-1">{APP_INFO.product} v{APP_INFO.version}</p>
      </div>
    </div>
  );
}
