# Jobsite Operations HQ

**Your AI-Powered Field Operations Command Center for Artificial Turf Installation**

> From first clock-in to last clock-out — every hour tracked, every delivery logged, every job prepped, every decision recorded. One app. Every platform. Zero gaps.

-----

## Table of Contents

1. [Vision](#vision)
1. [MVP Scope & Success Criteria](#mvp-scope--success-criteria)
1. [User Stories](#user-stories)
1. [Core Features](#core-features)
1. [Architecture Overview](#architecture-overview)
1. [Tech Stack](#tech-stack)
1. [Database Schema](#database-schema)
1. [Authentication & Roles](#authentication--roles)
1. [API Design & Edge Functions](#api-design--edge-functions)
1. [Module Breakdown](#module-breakdown)
1. [Development Phases & Milestones](#development-phases--milestones)
1. [Definition of Done](#definition-of-done)
1. [Testing Strategy](#testing-strategy)
1. [Development Workflow](#development-workflow)
1. [Data Collection Strategy](#data-collection-strategy)
1. [AI / Future Intelligence Layer](#ai--future-intelligence-layer)
1. [Risk Register](#risk-register)
1. [Deployment & Publishing](#deployment--publishing)
1. [File & Folder Structure](#file-structure)
1. [Future Roadmap](#future-roadmap)

-----

## Vision

Jobsite Operations HQ is a cross-platform personal assistant built for the field superintendent / operations lead running day-to-day artificial turf installation jobs. It captures **every data point** from the moment you start your day — crew hours, material deliveries, job progress, weather conditions, site photos, scheduling changes — and stores it permanently. The long-term goal: build a proprietary dataset that powers a **Turf AI** capable of answering any operational question a seasoned installer would know.

-----

## MVP Scope & Success Criteria

### What Is (and Is Not) in v1

The MVP focuses exclusively on the **core daily operations loop**. Every feature below must work end-to-end before launch.

| # | Feature | In MVP | Notes |
|---|---------|--------|-------|
| 1 | Auth — login, session persistence, logout | ✅ | Email/password only for v1 |
| 2 | Role system — owner, foreman, installer, laborer | ✅ | RLS enforced at DB level |
| 3 | Clock in / clock out with GPS verification | ✅ | GPS required; selfie optional |
| 4 | Job cards — create, view, edit, status update | ✅ | Core CRUD |
| 5 | Job stage tracker (9-stage pipeline) | ✅ | Stage transitions logged |
| 6 | Today's dashboard / morning briefing | ✅ | Jobs, crew, deliveries, weather |
| 7 | Crew assignments (assign crew to a job/day) | ✅ | |
| 8 | Delivery log — schedule, receive, flag issues | ✅ | |
| 9 | Photo capture (in-app, GPS-tagged, tied to job) | ✅ | |
| 10 | Daily log form (end-of-day summary) | ✅ | This is the AI training data |
| 11 | Site prep checklists | 🟡 | Nice-to-have; can follow in v1.1 |
| 12 | Reports & payroll export | 🟡 | Basic CSV only in v1 |
| 13 | Push notifications | 🟡 | Clock-in reminders only in v1 |
| 14 | Offline mode & sync | 🔴 | v2 — complex to implement correctly |
| 15 | Turf AI natural language queries | 🔴 | v3+ |
| 16 | Client portal | 🔴 | v2+ |

### MVP Success Criteria

The app is ready for field use when all of the following are true:

- [ ] Owner can log in and see today's dashboard in under 5 seconds on LTE
- [ ] A crew member can clock in (GPS-verified) in under 3 taps
- [ ] A foreman can create a job card and assign crew in under 2 minutes
- [ ] A delivery can be logged with photos and PO# in under 90 seconds
- [ ] End-of-day log can be submitted in under 5 minutes
- [ ] All data survives an app restart without data loss
- [ ] App runs on iOS 16+, Android 12+, and modern Chrome/Safari
- [ ] Zero critical crashes in 30 minutes of end-to-end testing

-----

## User Stories

User stories define what each role needs to accomplish. These drive feature prioritization and acceptance testing.

### Owner

| ID | Story | Priority |
|----|-------|----------|
| O-01 | As an owner, I can see a dashboard showing today's active jobs, clocked-in crew, and upcoming deliveries so I know the state of the business without making phone calls. | Must Have |
| O-02 | As an owner, I can view real-time time entries for all crew members and approve or flag edits. | Must Have |
| O-03 | As an owner, I can see labor cost vs. bid amount on any job to know if we're on budget. | Must Have |
| O-04 | As an owner, I can export a payroll report by date range and employee. | Should Have |
| O-05 | As an owner, I can view performance metrics (sqft/man-hour) per job and crew member. | Should Have |

### Foreman

| ID | Story | Priority |
|----|-------|----------|
| F-01 | As a foreman, I can clock myself and my crew in/out with GPS verification so time records are accurate. | Must Have |
| F-02 | As a foreman, I can update the job stage (e.g., move from "Base Work" to "Compaction") so progress is tracked in real time. | Must Have |
| F-03 | As a foreman, I can log an end-of-day report including work done, issues, decisions, and materials used. | Must Have |
| F-04 | As a foreman, I can receive a delivery: confirm items, photograph the delivery ticket, and flag damaged goods. | Must Have |
| F-05 | As a foreman, I can see tomorrow's job schedule, expected deliveries, and crew assignments when planning the next morning. | Must Have |
| F-06 | As a foreman, I can send a message to all crew members on a job or broadcast to everyone. | Should Have |

### Installer / Laborer

| ID | Story | Priority |
|----|-------|----------|
| I-01 | As an installer, I can clock in and clock out in one tap, with my GPS location recorded automatically. | Must Have |
| I-02 | As an installer, I can view the jobs I'm assigned to today, including the site address and special instructions. | Must Have |
| I-03 | As an installer, I can take and upload job photos (before/during/after) from within the app. | Must Have |
| I-04 | As an installer, I can log a problem or issue I found on site so it's visible to the foreman immediately. | Should Have |

### All Users

| ID | Story | Priority |
|----|-------|----------|
| U-01 | As any user, I can log in with my email and password and remain logged in across sessions. | Must Have |
| U-02 | As any user, my session is automatically invalidated after 30 days of inactivity. | Must Have |
| U-03 | As any user, I only see data and actions permitted by my role. | Must Have |

-----

## Core Features

### Daily Operations Loop

- **Clock-In / Clock-Out System** — GPS-stamped, photo-verified time tracking for you and your entire crew. Automatic break tracking. Overtime flags.
- **Morning Briefing Generator** — Auto-generated daily brief: today's jobs, crew assignments, expected deliveries, weather alerts, yesterday's carryover tasks.
- **End-of-Day Report** — One-tap daily summary: hours worked, tasks completed, materials used, issues flagged, photos captured. Auto-saved and exportable.

### Personnel Management

- **Crew Roster** — Full employee directory with roles, certifications, hourly rates, emergency contacts.
- **Time Tracking Dashboard** — Real-time view of who's clocked in, where, and for how long. Weekly/biweekly payroll summaries.
- **Crew Assignment Engine** — Drag-and-drop crew assignment to jobs. Skill-matching suggestions (e.g., seaming specialist on complex layouts).

### Job Site Management

- **Job Cards** — Each job gets a card: address, client info, square footage, turf type, base prep status, special notes, site photos, attached documents.
- **Site Prep Checklist** — Configurable checklists per job type (new install, rip-and-replace, pet turf, putting green, sports field).
- **Progress Tracker** — Stage-gated progress: Prep → Base → Compact → Layout → Cut → Seam → Infill → Final Walkthrough → Signed Off.

### Scheduling & Calendar

- **Master Schedule** — Week-at-a-glance and month view. Drag to reschedule. Conflict detection.
- **Delivery Scheduling** — Track incoming material deliveries: turf rolls, infill, base rock, adhesive, nails/staples, edging. Vendor, ETA, quantity, PO number.
- **Weather Integration** — Auto-pull weather forecasts. Flag rain days. Suggest schedule adjustments.

### Material & Inventory

- **Delivery Log** — Every delivery logged: date, vendor, PO#, items, quantities, photos of delivery ticket and material condition.
- **Material Usage Tracker** — Log materials used per job. Compare estimated vs. actual. Track waste.
- **Inventory Alerts** — Low-stock warnings for common consumables (adhesive, nails, infill bags).

### Communication Hub

- **Crew Messaging** — In-app messaging per job or broadcast to all. No more lost texts.
- **Client Updates** — One-tap status updates to clients: "Crew is on site," "Job 50% complete," "Final walkthrough ready."
- **Photo Documentation** — Before/during/after photos tied to job cards. Timestamped and GPS-tagged.

### Reporting & Analytics

- **Payroll Reports** — Export-ready time summaries by employee, job, or date range.
- **Job Costing** — Actual labor + material cost vs. bid price. Profit/loss per job.
- **Performance Metrics** — Crew efficiency (sqft/hr), job completion rates, callback/warranty rates.

-----

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│                                                         │
│   ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│   │   iOS    │  │ Android  │  │     Web (PWA)        │  │
│   │  (Expo)  │  │  (Expo)  │  │  (Expo Web/Next.js)  │  │
│   └────┬─────┘  └────┬─────┘  └──────────┬───────────┘  │
│        │              │                   │              │
│        └──────────────┼───────────────────┘              │
│                       │                                  │
│              ┌────────▼────────┐                         │
│              │  Expo Router    │                         │
│              │  (Navigation)   │                         │
│              └────────┬────────┘                         │
└───────────────────────┼─────────────────────────────────┘
                        │
                        │  HTTPS / WebSocket
                        │
┌───────────────────────┼─────────────────────────────────┐
│                 BACKEND LAYER (Supabase)                 │
│                       │                                  │
│   ┌───────────────────▼───────────────────────────┐      │
│   │              Supabase Gateway                 │      │
│   │    (Auth · REST · Realtime · Storage)         │      │
│   └───┬───────────┬──────────┬──────────┬─────────┘      │
│       │           │          │          │                 │
│  ┌────▼────┐ ┌────▼────┐ ┌──▼───┐ ┌────▼─────┐          │
│  │  Auth   │ │PostgreSQL│ │ Edge │ │ Storage  │          │
│  │(GoTrue)│ │   (DB)   │ │ Func │ │ (S3)     │          │
│  └────────┘ └─────────┘ └──────┘ └──────────┘          │
│                                                          │
│   ┌──────────────────────────────────────────────┐       │
│   │         Row Level Security (RLS)             │       │
│   │   Owner sees all · Crew sees their data      │       │
│   └──────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────┘
                        │
                        │  (Future)
                        ▼
┌──────────────────────────────────────────────────────────┐
│                  INTELLIGENCE LAYER                      │
│                                                          │
│   ┌────────────┐  ┌──────────────┐  ┌────────────────┐   │
│   │  Turf AI   │  │  Predictive  │  │  Voice         │   │
│   │  Knowledge │  │  Scheduling  │  │  Assistant     │   │
│   │  Engine    │  │  Engine      │  │  (Hands-Free)  │   │
│   └────────────┘  └──────────────┘  └────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

-----

## Tech Stack

### Why This Stack (Speed + Scale + Cross-Platform)

|Layer                 |Technology                               |Why                                                                                                                                             |
|----------------------|-----------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
|**Mobile + Web**      |**Expo (React Native)** with Expo Router |Single codebase → iOS, Android, and Web. Expo Router gives file-based routing like Next.js. OTA updates without app store resubmission.         |
|**Backend**           |**Supabase** (self-hosted or cloud)      |Instant PostgreSQL database, built-in auth, realtime subscriptions, file storage, Edge Functions. Fastest backend you can stand up in a weekend.|
|**Auth**              |**Supabase Auth (GoTrue)**               |Email/password, magic link, phone OTP, Google/Apple sign-in. Role-based access built on top.                                                    |
|**Database**          |**PostgreSQL** (via Supabase)            |Rock-solid relational DB. Full SQL power. Row Level Security for multi-tenant crew access.                                                      |
|**File Storage**      |**Supabase Storage**                     |Site photos, delivery tickets, signed documents. S3-compatible.                                                                                 |
|**Push Notifications**|**Expo Notifications**                   |Cross-platform push for delivery alerts, schedule changes, clock-in reminders.                                                                  |
|**Maps / GPS**        |**Expo Location** + **React Native Maps**|GPS clock-in verification, job site mapping, delivery tracking.                                                                                 |
|**Weather**           |**OpenWeatherMap API** (free tier)       |7-day forecasts tied to job site zip codes. Rain alerts.                                                                                        |
|**Offline Support**   |**WatermelonDB** or **Expo SQLite**      |Local-first data. Sync when back online. Critical for job sites with poor signal.                                                               |
|**State Management**  |**Zustand**                              |Lightweight, simple, fast. No Redux boilerplate.                                                                                                |
|**Styling**           |**NativeWind** (Tailwind for RN)         |Consistent styling across platforms. Rapid UI development.                                                                                      |

### Alternative Stacks Considered

|Option                 |Pros                                       |Cons                                           |Verdict                                 |
|-----------------------|-------------------------------------------|-----------------------------------------------|----------------------------------------|
|**Flutter + Firebase** |Beautiful UI, great perf                   |Dart ecosystem smaller, Firebase vendor lock-in|Good but Expo is faster for solo dev    |
|**.NET MAUI + Azure**  |Enterprise-grade                           |Heavy, slower iteration, steeper learning curve|Overkill for weekend build              |
|**Next.js + Capacitor**|Web-first with mobile wrapper              |Mobile feel is never quite native              |Good for v2 if web-first                |
|**Expo + Supabase**    |Fast, cross-platform, open-source, scalable|Need to learn Supabase if new                  |**Winner — best speed-to-quality ratio**|

-----

## Database Schema

### Core Tables

```sql
-- ============================================================
-- USERS & AUTH
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'foreman', 'installer', 'laborer', 'office')),
  phone TEXT,
  email TEXT,
  hourly_rate DECIMAL(6,2),
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  certifications TEXT[],        -- e.g., ['forklift', 'first_aid']
  profile_photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TIME TRACKING
-- ============================================================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  job_id UUID REFERENCES jobs(id),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  clock_in_lat DECIMAL(10,7),
  clock_in_lng DECIMAL(10,7),
  clock_out_lat DECIMAL(10,7),
  clock_out_lng DECIMAL(10,7),
  clock_in_photo_url TEXT,
  break_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'edited', 'flagged')),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- JOBS
-- ============================================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT UNIQUE NOT NULL,       -- e.g., 'JOB-2026-0042'
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),

  -- Job Specs
  total_sqft INTEGER,
  turf_type TEXT,                         -- e.g., 'Pet Turf 80oz', 'Putting Green'
  job_type TEXT CHECK (job_type IN (
    'new_install', 'rip_replace', 'pet_turf', 'putting_green',
    'sports_field', 'playground', 'commercial', 'repair'
  )),

  -- Financials
  bid_amount DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  material_cost DECIMAL(10,2),
  labor_cost DECIMAL(10,2),

  -- Status & Scheduling
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'lead', 'bid_sent', 'approved', 'scheduled', 'in_progress',
    'on_hold', 'completed', 'warranty', 'cancelled'
  )),
  stage TEXT DEFAULT 'not_started' CHECK (stage IN (
    'not_started', 'demo_prep', 'base_work', 'compaction',
    'turf_layout', 'cutting', 'seaming', 'infill',
    'final_walkthrough', 'signed_off'
  )),
  scheduled_date DATE,
  estimated_days INTEGER DEFAULT 1,
  start_date DATE,
  completion_date DATE,

  -- Notes & Docs
  notes TEXT,
  special_instructions TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CREW ASSIGNMENTS
-- ============================================================
CREATE TABLE crew_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  assignment_date DATE NOT NULL,
  role_on_job TEXT DEFAULT 'installer',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, user_id, assignment_date)
);

-- ============================================================
-- DELIVERIES
-- ============================================================
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  vendor TEXT NOT NULL,
  po_number TEXT,

  -- Scheduling
  expected_date DATE,
  expected_time_window TEXT,             -- e.g., '8am-12pm'
  actual_arrival TIMESTAMPTZ,

  -- Contents
  items JSONB NOT NULL,                  -- [{name, quantity, unit, sku}]

  -- Verification
  received_by UUID REFERENCES profiles(id),
  delivery_ticket_photo_url TEXT,
  condition_notes TEXT,
  condition_photos TEXT[],               -- array of storage URLs

  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'in_transit', 'delivered', 'partial', 'damaged', 'cancelled'
  )),

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DAILY LOGS (the data goldmine for Turf AI)
-- ============================================================
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by UUID REFERENCES profiles(id) NOT NULL,

  -- Conditions
  weather_temp INTEGER,
  weather_condition TEXT,                -- 'sunny', 'cloudy', 'rain', etc.
  ground_condition TEXT,                 -- 'dry', 'muddy', 'frozen', etc.

  -- Work Done
  stage_at_start TEXT,
  stage_at_end TEXT,
  sqft_completed INTEGER,
  work_summary TEXT,

  -- Issues & Decisions
  issues TEXT[],
  decisions_made TEXT[],                 -- why you made the call you did
  lessons_learned TEXT[],

  -- Materials Used
  materials_used JSONB,                  -- [{name, quantity, unit}]

  -- Photos
  photo_urls TEXT[],

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHECKLISTS
-- ============================================================
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  checklist_type TEXT NOT NULL,           -- 'site_prep', 'safety', 'final_walkthrough'
  items JSONB NOT NULL,                  -- [{label, checked, checked_by, checked_at}]
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHOTOS (universal photo log)
-- ============================================================
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  taken_by UUID REFERENCES profiles(id),
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT CHECK (category IN (
    'before', 'during', 'after', 'delivery', 'issue',
    'safety', 'walkthrough', 'other'
  )),
  caption TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  taken_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS & ACTIVITY FEED
-- ============================================================
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,                  -- 'clocked_in', 'delivery_received', etc.
  entity_type TEXT,                      -- 'job', 'delivery', 'time_entry'
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  category TEXT,                         -- 'turf', 'infill', 'adhesive', 'hardware', 'tools'
  current_qty DECIMAL(10,2),
  unit TEXT,                             -- 'sqft', 'bags', 'tubes', 'boxes', 'rolls'
  min_stock_alert DECIMAL(10,2),
  cost_per_unit DECIMAL(8,2),
  vendor TEXT,
  last_restocked TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  job_id UUID REFERENCES jobs(id),       -- NULL = broadcast
  channel TEXT DEFAULT 'general',        -- 'general', 'job-specific', 'urgent'
  body TEXT NOT NULL,
  attachments TEXT[],
  read_by UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);
```

-----

## Authentication & Roles

### Login Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  App Launch  │────▶│  Auth Screen │────▶│  Supabase Auth  │
│             │     │              │     │                 │
│  Check for  │     │  • Email/PW  │     │  • Verify creds │
│  session    │     │  • Phone OTP │     │  • Return JWT   │
│             │     │  • Apple SSO │     │  • Set session  │
│  If valid ──┼──┐  │  • Google    │     │                 │
│  skip login │  │  └──────────────┘     └─────────────────┘
└─────────────┘  │
                 │  ┌──────────────┐
                 └─▶│  Dashboard   │
                    │  (role-based)│
                    └──────────────┘
```

### Role Permissions

|Feature              |Owner|Foreman|Installer    |Laborer      |Office|
|---------------------|-----|-------|-------------|-------------|------|
|View all jobs        |✅    |✅      |Assigned only|Assigned only|✅     |
|Create/edit jobs     |✅    |✅      |❌            |❌            |✅     |
|Clock in/out (self)  |✅    |✅      |✅            |✅            |✅     |
|View all time entries|✅    |✅      |Own only     |Own only     |✅     |
|Approve time entries |✅    |✅      |❌            |❌            |❌     |
|Manage crew          |✅    |✅      |❌            |❌            |❌     |
|View financials      |✅    |❌      |❌            |❌            |✅     |
|Log deliveries       |✅    |✅      |✅            |❌            |✅     |
|Daily logs           |✅    |✅      |✅            |❌            |❌     |
|Reports & analytics  |✅    |Limited|❌            |❌            |✅     |
|Manage inventory     |✅    |✅      |❌            |❌            |✅     |
|Admin settings       |✅    |❌      |❌            |❌            |❌     |

### Implementation: Supabase Row Level Security

```sql
-- Example: Users can only see their own time entries,
-- but owners/foremen can see all
CREATE POLICY "time_entries_select" ON time_entries FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'foreman', 'office')
  )
);

-- Example: Only owners can see financial data on jobs
CREATE POLICY "jobs_financials" ON jobs FOR SELECT USING (
  CASE
    WHEN (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'office')
    THEN true
    ELSE bid_amount IS NULL  -- non-financial fields only
  END
);
```

-----

## API Design & Edge Functions

All standard CRUD operations go through **Supabase's auto-generated REST API** with RLS enforcing access. Edge Functions handle logic that can't (or shouldn't) live in the client.

### Supabase REST Patterns

```
GET    /rest/v1/jobs?status=eq.in_progress        → active jobs
POST   /rest/v1/time_entries                       → clock in
PATCH  /rest/v1/time_entries?id=eq.{id}            → clock out / edit
GET    /rest/v1/crew_assignments?assignment_date=eq.{date} → today's crew
POST   /rest/v1/daily_logs                         → submit end-of-day log
POST   /rest/v1/photos                             → log photo metadata
```

### Edge Functions (Server-Side Logic)

| Function | Trigger | Responsibility |
|----------|---------|----------------|
| `morning-briefing` | Cron 5:30 AM daily | Aggregate jobs, crew, deliveries, weather into a single briefing object |
| `daily-summary` | On-demand (user submits EOD) | Compile day's time entries, stage changes, deliveries, and logs into a summary |
| `weather-sync` | Cron every 2 hours | Fetch OpenWeatherMap forecast for all active job site zip codes; store in DB |
| `clock-in-reminder` | Cron 7:00 AM Mon–Sat | Push notification to crew assigned to today's jobs who haven't clocked in |
| `overtime-check` | On time_entries INSERT/UPDATE | Flag entries exceeding 8hrs/day or 40hrs/week; create activity_feed event |

### Edge Function Contracts

**`morning-briefing` Response:**
```json
{
  "date": "2026-03-07",
  "jobs_today": [...],
  "crew_assigned": [...],
  "deliveries_expected": [...],
  "weather": { "temp": 68, "condition": "Sunny", "forecast": [...] },
  "carryover_issues": [...],
  "alerts": [{ "type": "rain_warning", "message": "...", "job_id": "..." }]
}
```

**`daily-summary` Request / Response:**
```json
// POST body
{ "job_id": "uuid", "log_date": "2026-03-07" }

// Response
{
  "total_hours": 42.5,
  "crew_on_site": ["Alice", "Bob", "Carlos"],
  "stage_progression": "base_work → compaction",
  "sqft_completed": 620,
  "issues_flagged": 1,
  "materials_used": [{ "name": "Infill", "qty": 12, "unit": "bags" }],
  "photos_taken": 8
}
```

-----

## Module Breakdown

### Module 1: Command Center (Dashboard)

The home screen. Everything at a glance.

**Components:**

- `TodayBrief` — Auto-generated morning briefing (jobs, crew, deliveries, weather)
- `ActiveTimers` — Who's clocked in right now, live elapsed time
- `TodaySchedule` — Timeline view of today's jobs with status indicators
- `QuickActions` — Big tap targets: Clock In, Log Delivery, Take Photo, New Issue
- `WeatherStrip` — Current + 3-day forecast for active job sites
- `AlertBanner` — Urgent items: missing clock-ins, overdue deliveries, rain incoming

### Module 2: Time Clock

**Components:**

- `ClockInButton` — GPS + timestamp + optional selfie. One tap.
- `ClockOutButton` — Auto-calculates hours. Prompts for break time if none logged.
- `TimeSheet` — Editable time entries. Requires approval if modified.
- `PayrollExport` — Generate CSV/PDF by date range, employee, or job.
- `OvertimeTracker` — Flags entries over 8hrs/day or 40hrs/week.

### Module 3: Job Board

**Components:**

- `JobList` — Filterable/sortable list of all jobs. Search by client, address, status.
- `JobCard` — Full detail view. Tabs: Info, Crew, Schedule, Materials, Photos, Logs, Financials.
- `StageTracker` — Visual pipeline: Prep → Base → Compact → Layout → Cut → Seam → Infill → Walk → Sign-off.
- `ChecklistEngine` — Dynamic checklists per job type. Tap to complete items.
- `JobMap` — Map view of all active/scheduled jobs.

### Module 4: Crew Manager

**Components:**

- `CrewRoster` — All employees with status (active/on-site/off).
- `AssignmentBoard` — Drag crew members to jobs for a given day/week.
- `SkillMatrix` — Visual grid of who's certified for what.
- `CrewAvailability` — Calendar view of who's available when.

### Module 5: Delivery Tracker

**Components:**

- `DeliverySchedule` — Upcoming deliveries by date.
- `DeliveryForm` — Log new delivery: vendor, PO#, items, ETA.
- `ReceiveDelivery` — Confirm arrival. Photo of ticket. Note condition. Flag issues.
- `DeliveryHistory` — Searchable log of all past deliveries.

### Module 6: Material & Inventory

**Components:**

- `InventoryDashboard` — Current stock levels with alerts.
- `UsageLogger` — Log materials used per job.
- `WasteTracker` — Track and reduce waste over time.
- `ReorderAlerts` — Push notification when stock hits minimum threshold.

### Module 7: Photo Hub

**Components:**

- `CameraCapture` — In-app camera with auto-tagging (job, category, GPS, time).
- `PhotoGallery` — Browse by job, date, category.
- `BeforeAfter` — Side-by-side comparison tool.
- `PhotoExport` — Generate photo report for client handoff.

### Module 8: Reports & Analytics

**Components:**

- `PayrollReport` — Hours and pay by employee/period.
- `JobCostReport` — Bid vs. actual breakdown per job.
- `EfficiencyMetrics` — Sqft installed per man-hour. Trend charts.
- `WeeklyRecap` — Auto-generated weekly summary.
- `ExportCenter` — PDF/CSV export for any report.

### Module 9: Next Day / Week Prep

**Components:**

- `TomorrowPrep` — Auto-generated: jobs scheduled, crew needed, materials to confirm, deliveries expected.
- `WeekAhead` — 5-day lookahead with weather overlay.
- `PrepChecklist` — Confirm: trucks loaded, tools staged, crew notified, client contacted.

-----

## Development Phases & Milestones

Development is broken into four phases. Each phase ships a working, testable increment. Do not start the next phase until the current one meets its Definition of Done.

### Phase 1 — Foundation (MVP Core Loop)

**Goal:** A working app that can be used in the field on Day 1.

| Task | Owner | Notes |
|------|-------|-------|
| Expo project init + Supabase project creation | Dev | Use `--template tabs` |
| Connect Expo ↔ Supabase (client init, env vars) | Dev | |
| Run all DB migrations (schema from this doc) | Dev | Via `supabase db push` |
| Auth screens: login, signup, forgot password | Dev | Email/password only |
| Session persistence + auto-logout | Dev | Supabase SecureStore |
| Bottom tab navigator skeleton (5 tabs) | Dev | |
| Clock In screen (GPS + timestamp) | Dev | `expo-location` |
| Clock Out screen (auto-calc hours, break prompt) | Dev | |
| Job list screen (filterable) | Dev | |
| Job card: create + view + edit | Dev | |
| Job stage update (tap to advance) | Dev | |
| Today's Dashboard (jobs, timers, weather strip) | Dev | Static layout OK for now |
| Morning briefing Edge Function + display | Dev | |
| GPS clock-in verification (geofence or distance check) | Dev | |
| End-to-end test: login → clock in → update job → clock out | Dev | Manual QA |

**Phase 1 Exit Criteria:** All MVP Success Criteria checked off.

---

### Phase 2 — Enhanced Operations

**Goal:** Full crew and delivery operations. Enough to run the business entirely in the app.

| Task | Owner | Notes |
|------|-------|-------|
| Crew assignment board (assign crew to jobs per day) | Dev | |
| Crew roster CRUD | Dev | |
| Delivery log: schedule, receive, flag | Dev | |
| Delivery photo capture (ticket + condition) | Dev | |
| In-app camera (GPS-tagged, tied to job) | Dev | `expo-camera` |
| Photo gallery per job | Dev | |
| End-of-day log form | Dev | The AI training data entry point |
| Daily summary Edge Function | Dev | |
| Site prep checklists (per job type) | Dev | |
| Crew messaging (job channel + broadcast) | Dev | Supabase Realtime |
| Basic payroll CSV export | Dev | |
| Job cost report (bid vs. actual) | Dev | |
| Push notifications: clock-in reminder | Dev | `expo-notifications` |
| Overtime flag and activity feed | Dev | DB trigger + Edge Function |

**Phase 2 Exit Criteria:** A foreman can run a full workday entirely through the app with zero phone calls to the owner.

---

### Phase 3 — Analytics & Polish

**Goal:** Reports that replace spreadsheets. UI quality good enough to show clients.

| Task | Owner | Notes |
|------|-------|-------|
| Performance metrics dashboard (sqft/hr, completion rates) | Dev | |
| Weekly recap auto-generation | Dev | |
| Before/after photo comparison tool | Dev | |
| Client update one-tap messages | Dev | |
| Inventory management + low-stock alerts | Dev | |
| Waste tracking per job | Dev | |
| Week-ahead schedule view (5-day + weather overlay) | Dev | |
| Master calendar (month view, drag-to-reschedule) | Dev | |
| Skill matrix view (certifications per crew member) | Dev | |
| UI polish pass (spacing, loading states, error handling) | Dev | |
| App icon, splash screen, display name | Dev | |
| TestFlight / Play Store internal testing | Dev | |

**Phase 3 Exit Criteria:** App passes internal 30-day field test with zero data loss incidents.

---

### Phase 4 — Intelligence Layer (Future)

**Goal:** Turn the accumulated data into a competitive advantage.

| Task | Notes |
|------|-------|
| ETL pipeline: daily_logs + time_entries → vector DB | pgvector or Pinecone |
| RAG system powered by Claude API | Natural language queries over operational data |
| Job duration predictor | Based on sqft, type, crew, weather history |
| Material estimator (auto-calculate needs from sqft + type) | |
| Bid intelligence (cost-per-sqft benchmarks from history) | |
| Voice-to-log (hands-free daily summary dictation) | |
| Turf AI v1 launch | "How long do pet turf jobs over 2,000 sqft take?" |

-----

## Definition of Done

A feature is **done** when all of the following are true:

- [ ] **Functional:** The feature works end-to-end for all applicable user roles
- [ ] **Data integrity:** All writes to the DB are validated (type, constraint, RLS)
- [ ] **Error handled:** User sees a clear error message if something fails (no silent failures, no raw error objects shown)
- [ ] **Loading states:** Every async operation shows a loading indicator
- [ ] **Empty states:** Lists and dashboards handle zero-data gracefully
- [ ] **Tested:** At least one test covers the happy path (see Testing Strategy)
- [ ] **No console errors:** No unhandled promise rejections or red-box errors in dev mode
- [ ] **Responsive:** Tested on both a small phone (iPhone SE) and tablet/large screen

A **phase** is done when:
- [ ] All tasks in the phase checklist are marked complete
- [ ] All user stories in scope for the phase pass their acceptance criteria
- [ ] Phase Exit Criteria are verified by a real end-to-end test session

-----

## Testing Strategy

### Test Layers

| Layer | Tool | What it covers |
|-------|------|----------------|
| Unit | Jest + Testing Library | Pure functions (calculations, formatters, validators) |
| Component | React Native Testing Library | Individual UI components in isolation |
| Integration | Jest + Supabase local | Hooks and stores interacting with the DB |
| E2E | Detox (mobile) / Playwright (web) | Full user flows across screens |
| Manual QA | Checklist | Field simulation — real device, real GPS, real camera |

### Test Coverage Targets

- **Unit/Component:** 80% coverage on `lib/` and `stores/` directories
- **Integration:** Happy path + one failure path per Supabase query
- **E2E:** Cover all Must Have user stories (see User Stories section)
- **Manual QA:** Run before every Phase exit

### Key E2E Scenarios to Automate

1. **Clock-in flow** — Open app → tap Clock In → GPS captured → entry visible in timesheet
2. **Job creation** — Navigate to Jobs → New Job → fill form → save → job appears in list
3. **Stage advancement** — Open job → tap next stage → stage updates and is timestamped
4. **Delivery receive** — Open delivery → tap Receive → add photo → confirm → status = delivered
5. **Daily log submission** — Open EOD form → fill all fields → submit → log appears in job history
6. **Role gating** — Log in as installer → verify financial tabs are hidden on job card

### Running Tests

```bash
# Unit + component + integration tests
npx jest --coverage

# E2E tests (requires running simulator)
npx detox test --configuration ios.sim.debug

# Web E2E
npx playwright test
```

-----

## Development Workflow

### Branching Strategy

```
main          → production releases only
staging       → pre-release QA branch
dev           → active development target
feature/*     → individual features (branch from dev)
fix/*         → bug fixes (branch from dev)
```

**Example:**
```bash
git checkout dev
git pull origin dev
git checkout -b feature/delivery-photo-capture
# ... do work ...
git push origin feature/delivery-photo-capture
# Open PR → dev
```

### Pull Request Rules

- Every PR targets `dev` (never directly to `main`)
- PR description must reference the user story ID it satisfies (e.g., `Closes F-04`)
- CI must pass (lint + tests) before merge
- At least 1 review approval required
- Squash merge to keep history clean

### Commit Message Convention

```
type(scope): short description

Types: feat | fix | chore | docs | refactor | test
Scope: auth | jobs | timeclock | deliveries | crew | photos | reports | db

Examples:
feat(timeclock): add GPS verification on clock-in
fix(jobs): prevent stage regression below current stage
chore(db): add missing index on time_entries.user_id
```

### Local Development Setup

```bash
# 1. Clone and install
git clone <repo>
cd jobsite-ops-hq
npm install

# 2. Start local Supabase
supabase start
# Copy the anon key + URL from output

# 3. Set environment variables
cp .env.example .env.local
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# 4. Run DB migrations
supabase db push

# 5. Seed with test data
supabase db seed --file supabase/seed.sql

# 6. Start the app
npx expo start
```

### Code Style

- TypeScript strict mode enabled (`"strict": true` in tsconfig)
- ESLint + Prettier enforced in CI
- No `any` types — use proper interfaces from `types/`
- Supabase queries always use the generated types (`database.ts`)
- Zustand stores handle all remote state; components stay presentational

-----

## Data Collection Strategy

### Everything Gets Logged

The long-term value of this app is the **data**. Every interaction becomes a training datapoint for the future Turf AI.

```
DATA COLLECTION POINTS PER DAY:
│
├── Clock Events
│   ├── Clock-in time, GPS, photo
│   ├── Break start/end
│   └── Clock-out time, GPS
│
├── Job Activity
│   ├── Stage transitions (with timestamp)
│   ├── Checklist completions
│   ├── Crew assignments
│   └── Work summary notes
│
├── Environmental
│   ├── Weather (auto-pulled hourly)
│   ├── Ground conditions (manual)
│   └── Site access notes
│
├── Materials
│   ├── Deliveries received
│   ├── Materials used per job
│   └── Waste/scrap logged
│
├── Decisions & Issues
│   ├── Problems encountered
│   ├── Decisions made (and why)
│   ├── Schedule changes (and why)
│   └── Client interactions
│
├── Photos
│   ├── Before/during/after (GPS + time)
│   ├── Delivery verification
│   └── Issue documentation
│
└── Communications
    ├── Messages sent/received
    ├── Client updates
    └── Crew notifications
```

### Data Retention Policy

- **All operational data**: Retained indefinitely (this is your AI training set)
- **Photos**: Full resolution stored in Supabase Storage (S3-backed)
- **Deleted items**: Soft-deleted (flagged, not destroyed) for data integrity

-----

## AI / Future Intelligence Layer

### Phase 1: Smart Summaries (Build Now)

- End-of-day auto-summaries using collected data
- Morning briefings generated from schedule + weather + carryover tasks
- Simple pattern alerts: "You typically need 2 extra infill bags for jobs over 1,500 sqft"

### Phase 2: Predictive Operations (3-6 Months)

- **Job Duration Predictor** — Based on historical data: sqft, job type, crew size, weather → estimated completion time
- **Crew Optimizer** — Best crew combination for job type based on past performance
- **Material Estimator** — Auto-calculate materials needed based on sqft and job type
- **Weather Impact Model** — How weather patterns affect job timelines in your region

### Phase 3: Turf AI (6-12 Months)

- **Natural Language Queries** — "How long did pet turf jobs over 2,000 sqft take on average last summer?"
- **Decision Support** — "Should I schedule this outdoor job for Thursday? Here's the weather forecast and your historical rain-delay data."
- **Training Tool** — New hires can ask the AI questions and get answers based on your years of logged operational knowledge.
- **Bid Intelligence** — "Based on 47 similar jobs, your average cost per sqft for putting greens is $X. Your bid should be at least $Y."

### Data → AI Pipeline

```
Daily Logs ──┐
Time Data ───┤
Job Records ─┼──▶ ETL Pipeline ──▶ Vector DB ──▶ RAG System ──▶ Turf AI
Photos ──────┤                     (Pinecone/    (Claude API)
Weather ─────┤                      pgvector)
Decisions ───┘
```

-----

## Risk Register

Identify risks early. Plan mitigations before they become blockers.

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R-01 | Poor GPS signal on job sites (underground parking, warehouses) | High | Medium | Allow manual location entry as fallback; log GPS accuracy score |
| R-02 | Crew resistance to app adoption | Medium | High | Keep clock-in to max 2 taps; run training session on Day 1; foreman leads by example |
| R-03 | Supabase outage (cloud dependency) | Low | High | Enable offline queue for clock events; sync on reconnect; alert user when offline |
| R-04 | App Store review delays (iOS) | Medium | Medium | Use Expo OTA updates for bug fixes; submit early; web version available immediately |
| R-05 | Photo storage costs grow rapidly | Medium | Low | Compress images before upload (max 1MB); set Supabase Storage lifecycle rules |
| R-06 | Time entry disputes / manipulation | Low | High | GPS + photo at clock-in; edit trail logged; only owner/foreman can approve edits |
| R-07 | Data loss during schema migrations | Low | Critical | Always run migrations on a staging DB first; take a Supabase backup before any migration |
| R-08 | Expo SDK breaking changes on upgrade | Medium | Medium | Pin SDK version; test upgrades in a separate branch; read changelogs before upgrading |
| R-09 | Scope creep delaying Phase 1 ship | High | High | Enforce MVP scope table ruthlessly; log nice-to-haves in Future Roadmap, not the backlog |

-----

## Deployment & Publishing

### Development

```bash
# Install Expo CLI
npm install -g @expo/cli

# Create project
npx create-expo-app@latest jobsite-ops-hq --template tabs

# Install core dependencies
npx expo install expo-location expo-camera expo-image-picker
npx expo install @supabase/supabase-js
npx expo install expo-secure-store
npm install zustand nativewind
npm install react-native-maps

# Start dev server (all platforms)
npx expo start
```

### Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Init local project
supabase init

# Start local dev environment
supabase start

# Push schema to production
supabase db push

# Deploy Edge Functions
supabase functions deploy
```

### Build & Publish

```bash
# Build for iOS (requires Apple Developer account - $99/yr)
eas build --platform ios

# Build for Android (free to publish)
eas build --platform android

# Deploy web version
npx expo export --platform web
# Then deploy to Vercel, Netlify, or any static host

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_OPENWEATHER_API_KEY=your-weather-key
```

-----

## File Structure

```
jobsite-ops-hq/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth group (login, signup, forgot-pw)
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/                   # Main tab navigator
│   │   ├── index.tsx             # Dashboard / Command Center
│   │   ├── timeclock.tsx         # Clock in/out + timesheet
│   │   ├── jobs/
│   │   │   ├── index.tsx         # Job list
│   │   │   └── [id].tsx          # Job detail (dynamic route)
│   │   ├── deliveries.tsx        # Delivery tracker
│   │   └── more.tsx              # Settings, reports, crew, inventory
│   ├── _layout.tsx               # Root layout (auth check)
│   └── +not-found.tsx
│
├── components/                   # Reusable UI components
│   ├── ui/                       # Generic (Button, Card, Input, Modal)
│   ├── dashboard/                # Dashboard-specific components
│   ├── timeclock/                # Clock in/out components
│   ├── jobs/                     # Job card, stage tracker, etc.
│   ├── deliveries/               # Delivery form, list items
│   ├── crew/                     # Roster, assignment board
│   └── photos/                   # Camera, gallery, before-after
│
├── lib/                          # Core utilities
│   ├── supabase.ts               # Supabase client init
│   ├── auth.ts                   # Auth helpers
│   ├── location.ts               # GPS helpers
│   ├── weather.ts                # Weather API integration
│   ├── notifications.ts          # Push notification helpers
│   └── offline.ts                # Offline sync logic
│
├── stores/                       # Zustand state stores
│   ├── authStore.ts
│   ├── jobStore.ts
│   ├── timeStore.ts
│   ├── deliveryStore.ts
│   └── crewStore.ts
│
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts
│   ├── useJobs.ts
│   ├── useTimeClock.ts
│   ├── useLocation.ts
│   └── useWeather.ts
│
├── types/                        # TypeScript type definitions
│   ├── database.ts               # Auto-generated from Supabase
│   ├── job.ts
│   ├── user.ts
│   └── delivery.ts
│
├── constants/                    # App constants
│   ├── colors.ts
│   ├── jobTypes.ts
│   ├── stages.ts
│   └── checklists.ts
│
├── supabase/                     # Supabase config
│   ├── migrations/               # SQL migration files
│   ├── functions/                # Edge Functions
│   │   ├── morning-briefing/
│   │   ├── daily-summary/
│   │   └── weather-sync/
│   └── seed.sql                  # Test data
│
├── __tests__/                    # Test files (mirrors src structure)
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── assets/                       # Images, fonts, icons
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── tailwind.config.js            # NativeWind config
├── tsconfig.json
├── package.json
└── README.md                     # ← You are here
```

-----

## Future Roadmap

- [ ] Voice-to-log: Dictate daily summaries hands-free on the drive home
- [ ] Barcode/QR scanning for material tracking
- [ ] Client portal: Let clients check job status without calling you
- [ ] Subcontractor module: Track subs with limited access
- [ ] Equipment tracker: GPS on trailers, compactors, power brooms
- [ ] Integration with QuickBooks / accounting software
- [ ] Turf AI v1: Natural language queries on your operational data
- [ ] AR overlay: Point phone at job site, see turf layout projected on ground
- [ ] Offline mode: Full local-first with background sync
- [ ] Apple/Google SSO for faster crew onboarding

-----

## License

Proprietary — All rights reserved.

-----

*Built for the field, by someone who knows what it's like to run a crew, juggle deliveries, and still need to know what's happening on three job sites at once.*
