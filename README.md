# InstallOperations (IO)

**by Pro-Grade Artificial Turf**

> A Jobsite Operating System for installation crews and field-based construction companies.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://typescriptlang.org)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black)](https://vercel.com)

---

## Table of Contents

1. [What Is IO?](#what-is-io)
2. [Quick Start — Local Dev](#quick-start--local-dev)
3. [Environment Variables](#environment-variables)
4. [Authentication System](#authentication-system)
   - [How Login Works](#how-login-works)
   - [Password Reset Flow](#password-reset-flow)
   - [Local Dev Mode vs Supabase Mode](#local-dev-mode-vs-supabase-mode)
   - [Creating Users](#creating-users)
   - [Role System](#role-system)
   - [Session Behavior](#session-behavior)
5. [Soft Launch / Beta Guide](#soft-launch--beta-guide)
   - [Invite Codes](#invite-codes)
   - [Reddit Launch Checklist](#reddit-launch-checklist)
6. [Core Systems](#core-systems)
7. [App Structure & Navigation](#app-structure--navigation)
8. [Database Schema & Migrations](#database-schema--migrations)
9. [API Routes](#api-routes)
10. [Tech Stack](#tech-stack)
11. [File & Folder Structure](#file--folder-structure)
12. [Deployment — Vercel](#deployment--vercel)
13. [Testing](#testing)
14. [Development Workflow](#development-workflow)
15. [Known Limitations & Roadmap](#known-limitations--roadmap)
16. [Troubleshooting](#troubleshooting)

---

## What Is IO?

InstallOperations is a **contractor operations platform** built originally for Pro-Grade Artificial Turf's installation crews. It manages the full operational loop of a field-based business:

- **Time tracking** — Clock in/out with GPS, break tracking, overtime calculation
- **Job management** — Project cards with status stages, crew assignments, documentation
- **Employee management** — Profiles, pay rates, certifications, employment status
- **Field notes** — Daily logs, delivery receipts, notes with photo/audio attachments
- **Reports & payroll** — Timesheet approval, payroll generation, CSV export
- **Notifications** — Real-time alerts for approvals, time entries, job updates
- **Field tools** — Calculators (turf, grading, drainage), material estimators, checklists

**Built by installers. Tested in active field operations. Designed for real-world contractor workflows.**

---

## Quick Start — Local Dev

### Prerequisites

- Node.js 20+
- npm or pnpm
- (Optional) Supabase project for full auth + database

### 1. Clone and install

```bash
git clone https://github.com/RoguePancake/TESTER001.git
cd TESTER001
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials (see [Environment Variables](#environment-variables)).

**If you skip this step**, the app runs in **local dev mode** — a fully functional offline mode using localStorage for auth and data. See [Local Dev Mode](#local-dev-mode-vs-supabase-mode).

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll land on the login page.

### 4. Sign in

**Local dev mode** (no Supabase configured):
- Email: `DEV@USA.COM`
- Password: `Freedom1776`

**Supabase mode**: Use a real account created via the Admin panel.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (prod) | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (prod) | Supabase anon/public key — safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (prod) | Supabase service role key — **server-side only**, never expose to client |

### Getting your Supabase keys

1. Go to [supabase.com](https://supabase.com) → Your Project → Settings → API
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (add to Vercel env only, never commit)

### Vercel environment setup

In Vercel dashboard → Project → Settings → Environment Variables, add all three. Mark `SUPABASE_SERVICE_ROLE_KEY` as **Server** only (not exposed to browser).

> **Never commit `.env.local` or any file containing `service_role` to git.**

---

## Authentication System

### How Login Works

IO uses a **dual-mode authentication system**:

```
NEXT_PUBLIC_SUPABASE_URL set?
  ├── YES → Supabase Auth (JWT tokens, email/password, real accounts)
  └── NO  → Local Dev Mode (localStorage, no network required)
```

The mode is determined at startup in `lib/supabase.ts`. If the env vars are missing, `supabase` is `null` and the entire app uses localStorage-based auth.

**The Supabase path is the production path. Always deploy with Supabase configured.**

#### Auth flow (Supabase mode)

1. User submits email + password on `/auth`
2. `supabase.auth.signInWithPassword()` validates credentials
3. Supabase returns a JWT session (stored by the Supabase SDK automatically)
4. `AppShell` listens to `onAuthStateChange` and loads the user's profile from the `profiles` table
5. Role-based navigation is rendered based on `profiles.role`
6. On logout, `supabase.auth.signOut()` clears the session and redirects to `/auth`

**Key files:**
- `app/auth/page.tsx` — Login UI, forgot password, "forgot sent" states
- `app/auth/reset/page.tsx` — Password reset callback (handles Supabase reset links)
- `app/AppShell.tsx` — App-wide auth guard, session listener, navigation
- `lib/supabase.ts` — Supabase client initialization + all TypeScript types
- `lib/local-auth.ts` — Local dev auth (localStorage sessions + accounts)

---

### Password Reset Flow

**How it works end-to-end:**

1. User clicks **"Forgot password?"** on the login page
2. Enters their email → clicks **"Send Reset Link"**
3. `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/reset' })` fires
4. Supabase sends an email with a magic link
5. User clicks the link → lands on `/auth/reset`
6. `onAuthStateChange` fires `PASSWORD_RECOVERY` event
7. User sets a new password → `supabase.auth.updateUser({ password })` updates it
8. Redirect to dashboard on success

**To configure in Supabase:**
- Dashboard → Auth → Email Templates → "Reset Password"
- Customize the email template as needed
- Make sure your site URL is set: Dashboard → Auth → URL Configuration → Site URL

---

### Local Dev Mode vs Supabase Mode

| Feature | Local Dev Mode | Supabase Mode |
|---|---|---|
| Auth storage | `localStorage` | Supabase managed JWT |
| Accounts | localStorage `jobsite_accounts` | `auth.users` + `profiles` table |
| Password security | Plain text (dev only) | Bcrypt via Supabase |
| Session expiry | 8 hours | Supabase default (1 week) |
| Password reset | Not available | Full email reset flow |
| Real-time subscriptions | Not available | Available |
| Multi-device sync | No | Yes |
| Production ready | **No** | Yes |

**Default dev account:**
- Email: `DEV@USA.COM`
- Password: `Freedom1776`
- Role: `CreativeEditor` (full admin access)

> Local dev mode exists purely for development without a Supabase project. It is not secure for real user data. Never deploy to production without Supabase configured.

---

### Creating Users

**There is no self-signup flow.** Users are created by admins only. This is intentional — IO is an internal operations tool, not a public app.

**To create a user (Supabase mode):**

1. Sign in with a `company_owner` or `CreativeEditor` account
2. Navigate to `/admin` → Users tab
3. Click "Add User" → fill in name, email, password, role, company
4. The admin panel calls `POST /api/admin/users` which uses the service role key to create the auth user and profile in one transaction

**To create a user (local dev mode):**

1. Navigate to `/admin` → Users tab
2. Create a user — it's stored in `localStorage` under `jobsite_accounts`

**To bulk-create users for a beta launch:**
- Create accounts one-by-one via the admin panel
- OR use the Supabase dashboard → Auth → Users → "Invite user" to send magic link invitations

---

### Role System

IO has four roles in a strict hierarchy:

| Role | Label | Access |
|---|---|---|
| `CreativeEditor` | Dev/Platform Admin | Full access to everything, including Dev Tools |
| `company_owner` | Company Owner | Full company access, admin panel, payroll |
| `field_manager` | Field Manager | Jobs, employees, time approval, reports |
| `employee` | Employee | Time clock, notes, own data only |

**Role is set in the `profiles.role` column in Supabase.**

#### Permission matrix

| Permission | employee | field_manager | company_owner | CreativeEditor |
|---|---|---|---|---|
| Clock in/out | ✅ | ✅ | ✅ | ✅ |
| View own time | ✅ | ✅ | ✅ | ✅ |
| View all time | ✗ | ✅ | ✅ | ✅ |
| Approve time | ✗ | ✅ | ✅ | ✅ |
| View employees | ✗ | ✅ | ✅ | ✅ |
| Edit employees | ✗ | ✗ | ✅ | ✅ |
| Finalize payroll | ✗ | ✗ | ✅ | ✅ |
| Admin panel | ✗ | ✗ | ✅ | ✅ |
| Create companies | ✗ | ✗ | ✗ | ✅ |
| Dev tools | ✗ | ✗ | ✗ | ✅ |

Role logic lives in `lib/engines/permissions.ts`.

---

### Session Behavior

**Supabase mode:**
- Sessions are managed by the Supabase SDK
- Default expiry: 1 week (configurable in Supabase Auth settings)
- `onAuthStateChange` in `AppShell` automatically reacts to session expiry and redirects to `/auth`
- Token refresh is handled automatically by the Supabase client

**Local dev mode:**
- Sessions expire after **8 hours** (enforced in `lib/local-auth.ts`)
- Expiry is checked on every `getLocalSession()` call
- Expired sessions are automatically cleared and user is redirected to login

---

## Soft Launch / Beta Guide

This section documents the recommended approach for a controlled soft launch (e.g., Reddit beta).

### Who Gets Access

IO is an **invite-only platform**. There is no public signup. For a Reddit soft launch:

1. Post on your target subreddit explaining what IO is and asking for beta testers
2. DM interested users and create their accounts via the Admin panel
3. Send them their credentials directly (or use Supabase's "Invite User" feature which sends a magic link email)

### Invite Codes

The database includes an `invite_codes` table (migration `006_invite_codes.sql`) for gated signups if you ever add a self-signup flow.

**To generate invite codes via Supabase SQL editor:**

```sql
insert into invite_codes (code, note, max_uses)
values
  ('BETA-001', 'Reddit batch 1', 1),
  ('BETA-002', 'Reddit batch 1', 1),
  ('BETA-003', 'Reddit batch 1', 1);
```

**To check usage:**

```sql
select code, use_count, max_uses, used_at, note
from invite_codes
order by created_at desc;
```

The `consume_invite_code(code, profile_id)` SQL function handles atomic validation and consumption.

### Reddit Launch Checklist

Before posting to Reddit, verify each item:

**Auth & Access**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel (server-only)
- [ ] At least one `company_owner` account exists in Supabase
- [ ] Test password reset end-to-end: request reset email → receive it → set new password → login
- [ ] Supabase Auth rate limits are enabled (Dashboard → Auth → Rate Limits)
- [ ] Supabase site URL is set correctly (Dashboard → Auth → URL Configuration)

**Supabase Email**
- [ ] Supabase SMTP is configured (or using default Supabase email)
- [ ] Test "Forgot Password" email is deliverable (check spam too)
- [ ] Email templates are customized with your branding (Dashboard → Auth → Email Templates)

**App**
- [ ] Build passes without errors: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] App loads correctly on production URL
- [ ] Login → dashboard flow works
- [ ] Mobile view works (IO is used on phones in the field)

**Database**
- [ ] All migrations have been applied (`001` through `006`)
- [ ] Row Level Security (RLS) is enabled on all tables
- [ ] At least one company record exists in the `companies` table

**Monitoring**
- [ ] Vercel deployment logs are accessible
- [ ] Supabase database logs are accessible (Dashboard → Logs)

---

## Core Systems

IO is built around five interconnected systems:

### 1. Identity System (`/employees`)
Manages workforce data.
- Employee profiles: name, contact, hire date, certifications
- Pay rates with job-specific overrides and effective date history
- Crew assignments and role management
- Employment status lifecycle (active → on leave → terminated)
- Skills and certification tracking

### 2. Job System (`/` dashboard + job detail pages)
Manages installation projects.
- Job cards with client info, address, scope, assigned crew
- 9-stage project pipeline with transition logging
- Daily field logs linked to each job
- Delivery records and material tracking per job
- Photo and document attachments

### 3. Time & Payroll System (`/hours`)
Tracks labor and generates payroll.
- Clock in/out with optional GPS verification
- Break tracking and duration calculation
- Time entries linked to specific jobs
- Pay rate snapshot at time of entry (immutable record)
- Timesheet approval workflow: `pending → approved/rejected`
- Overtime calculation (standard, California, custom rules)
- Payroll summary generation with CSV export (QuickBooks/Gusto compatible)

### 4. Materials & Logistics (`/notepad`)
Tracks field notes and deliveries.
- NAF (Notes, Attachments, Files) system for all field documentation
- Daily log entries with weather, work summary, materials used
- Delivery receipts with PO numbers, vendor, condition notes
- Photo and audio attachments on any entry
- Pinned notes for critical information

### 5. Intelligence System (`/reports`)
Operational analytics.
- Labor cost per job
- Production speed (sqft/hour by crew and employee)
- Timesheet summaries by pay period
- Employee productivity trends
- PDF export for timesheets and reports
- Activity audit log (who did what and when)

---

## App Structure & Navigation

Navigation is role-filtered. What each role sees:

| Route | Label | Minimum Role | Description |
|---|---|---|---|
| `/` | IO Home | employee | Dashboard — active crew, jobs, activity |
| `/hours` | Pay Clock | employee | Clock in/out, time entries, approval queue |
| `/notepad` | Notepad | employee | Field notes, daily logs, deliveries |
| `/tools` | Tools | employee | Field calculators, checklists |
| `/notifications` | Alerts | employee | Notification inbox |
| `/settings` | Settings | employee | Display preferences, app config |
| `/system` | System Info | employee | Version, modules, contact |
| `/employees` | Employees | field_manager | Workforce management |
| `/reports` | Reports | field_manager | Analytics and exports |
| `/admin` | Admin | company_owner | User management, system stats |
| `/dev-tools` | Dev Tools | CreativeEditor | Debug tools, data inspection |
| `/auth` | Sign In | public | Login page |
| `/auth/reset` | Reset Password | public | Password reset callback |

---

## Database Schema & Migrations

Migrations live in `/supabase/migrations/`. Run them in order against your Supabase project.

### Applying migrations

**Via Supabase SQL editor** (simplest):
1. Dashboard → SQL Editor
2. Open each `.sql` file in order and run it

**Via Supabase CLI** (recommended for teams):
```bash
supabase db push
```

### Migration history

| File | Contents |
|---|---|
| `001_init.sql` | Core tables: `profiles`, `time_entries`, `daily_logs`, `deliveries`, `checklist_items` |
| `002_deliveries_checklists.sql` | Delivery and checklist enhancements |
| `003_naf_and_settings.sql` | NAF entries, attachments, `app_settings` |
| `004_modular_architecture.sql` | `companies`, `crews`, `crew_members`, notifications, automation rules |
| `005_employee_management_system.sql` | Pay rates, job assignments, payroll summaries, activity logs, enhanced profiles |
| `006_invite_codes.sql` | Invite codes for beta/gated access + `consume_invite_code()` function |

### Key tables

```
profiles          — User accounts (linked to auth.users via auth_id)
companies         — Company records (multi-tenant capable)
crews             — Named crew groups
crew_members      — Crew↔user join table
time_entries      — Clock in/out records with approval status
daily_logs        — Daily field journal entries
deliveries        — Material delivery records
naf_entries       — Notes, announcements, field reports
naf_attachments   — Files/photos/audio linked to NAF entries
job_sites         — Project cards
job_assignments   — Employee↔job assignments
pay_rates         — Pay rate history per employee
payroll_summaries — Finalized payroll records per pay period
notifications     — User notification inbox
activity_logs     — Audit trail for all admin actions
app_settings      — Key-value store for app configuration
invite_codes      — Beta/gated access codes
```

### Row Level Security (RLS)

All tables have RLS enabled. The general policy pattern:
- Employees see their own data only
- Managers see data within their company
- Owners see all company data
- `CreativeEditor` has unrestricted access

API routes use the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for administrative operations (user creation, payroll finalization). This key must never be exposed to the browser.

---

## API Routes

All API routes are in `app/api/`. They require a `Bearer` token in the `Authorization` header.

### Authentication pattern

Every protected API route:
1. Extracts the JWT from `Authorization: Bearer <token>`
2. Verifies the token: `supabase.auth.getUser(token)`
3. Looks up the user's profile and role in `profiles`
4. Rejects if role is insufficient

### Available routes

| Method | Route | Roles | Description |
|---|---|---|---|
| `POST` | `/api/admin/users` | CreativeEditor, company_owner | Create a new user account |
| `PATCH` | `/api/admin/users` | CreativeEditor, company_owner | Update a user's profile |
| `DELETE` | `/api/admin/users` | CreativeEditor, company_owner | Deactivate a user |
| `GET` | `/api/employees` | field_manager+ | List employees with filters |
| `PATCH` | `/api/employees` | company_owner+ | Update employee profile |
| `GET` | `/api/payroll` | company_owner+ | Get payroll summaries |
| `POST` | `/api/payroll` | company_owner+ | Finalize a payroll period |
| `POST` | `/api/time-entries/approve` | field_manager+ | Approve or reject time entries |

### Calling API routes from the client

```typescript
// Get the session token
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Call a protected route
const res = await fetch('/api/employees', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

---

## Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router) | 15.2.8 | Server + client components, API routes |
| Language | TypeScript | 5.9.3 | Strict mode |
| Styling | Tailwind CSS | 3.4 | Dark theme, utility-first |
| Auth & DB | Supabase | 2.49.4 | Auth, Postgres, RLS, real-time |
| PDF Export | @react-pdf/renderer | 4.3.2 | Timesheet and report PDFs |
| Testing | Vitest + Testing Library | 4.1 | Unit and component tests |
| Deployment | Vercel | — | Edge-optimized, auto-deploy from `main` |

### Why these choices?

- **Next.js App Router** — Server components for data-heavy pages, client components only where needed (auth, interactive UI)
- **Supabase** — Handles auth, database, RLS, and real-time in one service. No need to build or maintain a separate backend
- **Tailwind** — Consistent dark theme across all screens without a component library dependency
- **Vercel** — Zero-config deployment with preview URLs per PR

---

## File & Folder Structure

```
TESTER001/
├── app/
│   ├── AppShell.tsx          # App wrapper: auth guard, nav, session management
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Dashboard (home)
│   ├── globals.css           # Global styles + CSS variables
│   ├── auth/
│   │   ├── page.tsx          # Login page (sign in + forgot password)
│   │   └── reset/
│   │       └── page.tsx      # Password reset callback
│   ├── admin/
│   │   └── page.tsx          # Admin panel (user/company/system management)
│   ├── api/
│   │   ├── admin/users/      # User CRUD (service role)
│   │   ├── employees/        # Employee data
│   │   ├── payroll/          # Payroll generation
│   │   └── time-entries/
│   │       └── approve/      # Time entry approval
│   ├── dev-tools/            # Developer debug tools (CreativeEditor only)
│   ├── employees/            # Employee management UI
│   ├── hours/                # Pay clock / timesheet UI
│   ├── notepad/              # Field notes and deliveries
│   ├── notifications/        # Notification inbox
│   ├── reports/              # Reports and analytics
│   ├── settings/             # App settings and preferences
│   ├── system/               # System info page
│   └── tools/                # Field calculators and utilities
│
├── lib/
│   ├── supabase.ts           # Supabase client + all TypeScript interfaces
│   ├── local-auth.ts         # localStorage auth (dev mode only)
│   ├── display-preferences.ts # UI theme/display settings
│   └── engines/
│       └── permissions.ts    # Role definitions, permission checks, helpers
│
├── components/               # Shared UI components
│
├── supabase/
│   └── migrations/           # SQL migration files (001–006)
│       ├── 001_init.sql
│       ├── 002_deliveries_checklists.sql
│       ├── 003_naf_and_settings.sql
│       ├── 004_modular_architecture.sql
│       ├── 005_employee_management_system.sql
│       └── 006_invite_codes.sql
│
├── __tests__/                # Test files
├── .env.example              # Environment variable template
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── package.json
```

---

## Deployment — Vercel

### Initial deployment

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Select the `TESTER001` repo
4. Add environment variables (see [Environment Variables](#environment-variables))
5. Deploy — Vercel auto-detects Next.js

### Subsequent deployments

Pushes to `main` automatically trigger production deploys. Pushes to other branches create preview URLs.

### Vercel configuration

`vercel.json` in the root handles any custom routing or function configuration.

### Checklist before deploying

- [ ] All three env vars set in Vercel dashboard
- [ ] `npm run build` passes locally without errors
- [ ] All Supabase migrations applied to production database
- [ ] At least one admin user created in production
- [ ] Supabase redirect URLs include your production domain:
  - Dashboard → Auth → URL Configuration
  - Add: `https://your-domain.vercel.app/**`

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

Tests use **Vitest** + **Testing Library**. Test files live in `__tests__/`.

### What's tested

- Permission engine logic (`lib/engines/permissions.ts`)
- Time calculation utilities
- Component rendering (where applicable)

### Running a specific test file

```bash
npx vitest run __tests__/permissions.test.ts
```

---

## Development Workflow

### Branch strategy

- `main` — Production branch, auto-deploys to Vercel
- `claude/<feature-name>` — Feature branches (Claude-generated work)
- All PRs target `main`

### Local dev flow

```bash
# Start dev server
npm run dev

# Run tests before committing
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

### Adding a new page

1. Create `app/<route>/page.tsx`
2. Add the route to `ALL_NAV_LINKS` in `app/AppShell.tsx` if it should appear in nav
3. Set `minRole` to restrict access by role
4. If the page needs server data, add an API route in `app/api/`

### Adding a new API route

1. Create `app/api/<route>/route.ts`
2. Follow the auth pattern (extract Bearer token → verify with Supabase → check role)
3. Use `SUPABASE_SERVICE_ROLE_KEY` only for operations that need to bypass RLS

### Adding a database table

1. Create `supabase/migrations/00N_description.sql`
2. Add `create table`, `create index`, `alter table enable row level security`, `create policy` statements
3. Add the corresponding TypeScript interface to `lib/supabase.ts`
4. Apply the migration: Supabase dashboard → SQL Editor → run the file

---

## Known Limitations & Roadmap

### Current limitations

| Issue | Impact | Workaround |
|---|---|---|
| No self-signup | Users must be created by an admin | Use Admin panel or Supabase "Invite User" |
| No 2FA | Accounts rely on password only | Use strong passwords; Supabase supports TOTP if needed |
| No CSRF tokens on API routes | Theoretical risk for state-changing endpoints | Supabase JWT validation + SameSite cookies mitigates this in practice |
| No rate limiting middleware | API routes could be called in loops | Supabase project-level rate limits apply; add middleware if needed |
| Local mode passwords plain text | Dev only | Never use local mode in production |
| No offline mode | App requires network | PWA/offline support is on the roadmap |

### Roadmap

**Near-term (beta polish)**
- [ ] Notification email delivery (time entry approvals, job status changes)
- [ ] GPS verification improvements (better accuracy on mobile)
- [ ] Job stage photos — attach photos to stage transitions
- [ ] Bulk time entry import from CSV

**Medium-term**
- [ ] Client portal — read-only job status view for customers
- [ ] Equipment tracking — tools and vehicles assigned to jobs
- [ ] Estimating module — job quoting with material and labor cost templates
- [ ] Inventory system — warehouse stock levels and reorder alerts
- [ ] PWA / offline mode — full functionality without network

**Long-term vision**
- [ ] AI jobsite assistant — natural language queries against operational data
- [ ] Industry benchmarking — aggregate anonymized data for productivity comparisons
- [ ] Multi-trade support — expand beyond turf to any field contractor trade
- [ ] Mobile native app — React Native or Expo wrapper

---

## Troubleshooting

### "Invalid email or password" but credentials are correct

1. Verify you're in **Supabase mode** — check that env vars are set in Vercel
2. Check the Supabase dashboard → Auth → Users — confirm the user exists and is not banned
3. Check if email confirmation is required: Dashboard → Auth → Email → "Confirm email" setting
4. Check Supabase Auth logs: Dashboard → Logs → Auth for the specific error

### App redirects to login after every refresh

1. Supabase session may be expiring — check `autoRefreshToken` is `true` in your client config
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correctly set in Vercel (not `.env.local` which isn't used in production)
3. Check browser console for Supabase auth errors

### Password reset email not arriving

1. Check spam/junk folder
2. Verify Supabase SMTP is configured: Dashboard → Auth → SMTP Settings
3. Check Supabase email logs: Dashboard → Logs → Auth — look for `send_email` events
4. Confirm your site URL is set correctly: Dashboard → Auth → URL Configuration → Site URL
5. Make sure `/auth/reset` is included in your allowed redirect URLs

### "User not found in profiles" after login

This means the user exists in `auth.users` but has no matching row in `profiles`.

Fix via SQL:
```sql
insert into profiles (auth_id, full_name, email, role, is_active)
values (
  '<auth.users uuid>',
  'User Name',
  'user@email.com',
  'employee',
  true
);
```

Or recreate the user via the Admin panel which handles both tables atomically.

### Local mode is showing in production

The app falls back to local dev mode when `NEXT_PUBLIC_SUPABASE_URL` is missing. The login page footer will show **"Running in local dev mode — no Supabase connected"**.

Fix: Add the env vars in Vercel → Project → Settings → Environment Variables → Redeploy.

### Build fails with TypeScript errors

```bash
npx tsc --noEmit
```

This shows all type errors. Common issues:
- Missing null checks on `supabase` (it can be null in local mode — always check `if (supabase)` before use)
- Untyped API response data — add the appropriate interface from `lib/supabase.ts`

---

## Contributing

This project is internally developed by Pro-Grade Artificial Turf. External contributions are not currently accepted.

For internal developers:
1. Branch off `main` with a descriptive name
2. Make changes, run `npm test` and `npm run build`
3. Open a PR targeting `main`
4. Describe what you changed and why

---

*InstallOperations — Built by installers, for installers.*
