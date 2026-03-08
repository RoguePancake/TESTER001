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
1. [Feature Spec: Time Clock & Clock Management](#feature-spec-time-clock--clock-management)
1. [Feature Spec: Journal & Field Notes](#feature-spec-journal--field-notes)
1. [Feature Spec: Field Tools](#feature-spec-field-tools)
1. [Development Phases & Milestones](#development-phases--milestones)
1. [Definition of Done](#definition-of-done)
1. [Week 1 Field Test Protocol](#week-1-field-test-protocol)
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
| 11 | Site prep checklists | ✅ | Moved to v1 — required for Week 1 field test |
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

-- ============================================================
-- FIELD NOTES (mid-shift quick notes — separate from EOD logs)
-- ============================================================
CREATE TABLE field_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  body TEXT NOT NULL,                        -- max 2000 chars
  category TEXT DEFAULT 'general' CHECK (category IN (
    'general', 'issue', 'material', 'instruction', 'safety', 'client'
  )),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Schema Additions for Feature Specs

Run these `ALTER TABLE` statements alongside the base schema:

```sql
-- time_entries: break tracking, GPS accuracy, edit audit trail
ALTER TABLE time_entries
  ADD COLUMN breaks JSONB DEFAULT '[]',        -- [{started_at, ended_at, duration_minutes}]
  ADD COLUMN gps_accuracy_meters INTEGER,      -- NULL = GPS not used (manual entry)
  ADD COLUMN gps_manual BOOLEAN DEFAULT false, -- true = location entered manually
  ADD COLUMN edit_history JSONB DEFAULT '[]';  -- [{edited_by, edited_at, original_in, original_out, reason}]

-- daily_logs: draft/submitted lifecycle + edit audit trail
ALTER TABLE daily_logs
  ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  ADD COLUMN edit_history JSONB DEFAULT '[]';

-- deliveries: items JSONB documented shape
-- Each item in the items array: { name, quantity, unit, sku, received_quantity, item_status }
-- item_status: 'full' | 'short' | 'over' | 'damaged'
COMMENT ON COLUMN deliveries.items IS
  'Array of {name, quantity, unit, sku, received_quantity, item_status} objects';
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

## Feature Spec: Time Clock & Clock Management

These specs fill the gaps left by the module-level description. A developer can build directly from this section.

### Clock-In User Flow

**Screen 1 — Pre-Clock-In State**
- Large "Clock In" button (minimum 60×60pt touch target — glove-accessible)
- Shows "Not clocked in" + last clock-out time
- Job selector (required before clock-in proceeds) — picker populated from today's crew assignments
- If already clocked in: screen shows active timer with "Clock Out" and "Start Break" options

**Screen 2 — GPS Acquisition (blocking step)**
- Calls `expo-location` with `accuracy: Location.Accuracy.Balanced`
- Shows spinner: "Getting your location…"
- GPS accuracy tolerance: **500 meters**. If device reports accuracy > 500m: warn but do not block — "GPS signal weak — location recorded as approximate"
- Timeout: **15 seconds**. If no GPS fix, offer "Use Last Known Location" or "Enter Location Manually"
- Manual fallback stores `gps_manual = true` on the time entry and records no coordinates

**Screen 3 — Confirmation**
- Shows: job name, current time, GPS accuracy indicator (green ≤100m / yellow ≤500m / red >500m or manual)
- "Confirm Clock In" button — large, single tap
- On confirm: INSERT to `time_entries` with `clock_in`, lat/lng, job_id, `gps_accuracy_meters`

**Error States:**
- GPS permission denied → modal: "Location access is required. Enable in Settings." + deep-link to device settings
- Network error on POST → queue clock-in to Expo SQLite write queue; show "Saved locally — will sync when connected"

### Clock-Out User Flow

**Active Shift Screen:**
- Shows: job, clock-in time, live elapsed counter, current date
- Three actions: **Clock Out** / **Start Break** / **Add Note**
- If shift exceeds 5 hours with no break logged: soft banner "Don't forget to log your lunch break"

**Clock-Out Steps:**
1. Tap "Clock Out"
2. GPS acquired (same 500m tolerance, 15s timeout)
3. If break is currently running: auto-end break, note shown
4. Confirmation screen: total hours, break deducted, net hours, job
5. "Confirm Clock Out" → PATCH `time_entries` with `clock_out`, coordinates, calculated `overtime_minutes` (anything > 480 net minutes)

### Break Tracking Flow

Break is a first-class shift action — not an afterthought.

**States:** `on_break` (timer running, "End Break" button only) · `not_on_break` ("Start Break" available)

**Break Flow:**
1. Tap "Start Break" — no GPS required, timestamp only
2. Active shift view switches to "On Break" mode with elapsed break timer
3. Clock Out is **disabled** while on break (prevents accidental early checkout)
4. Tap "End Break" → duration appended to `breaks` JSONB array, shift resumes

**Break Rules:**
- Minimum logged duration: 1 minute (prevents accidental taps)
- Maximum before auto-flag: 90 minutes → creates `activity_feed` event "Break exceeded 90 min — review required"
- If break is running at clock-out: auto-ended, shown in summary as "Break auto-ended at clock-out"

### Time Entry Edit & Approval Workflow

**Self-edit (any role):**
1. Open own timesheet → tap entry → "Request Edit"
2. Enter corrected times + reason (required, max 200 chars)
3. Entry status → `'edited'`; original values saved to `edit_history` JSONB
4. Foreman receives in-app notification: "Carlos has requested a timesheet edit"

**Approval (foreman/owner):**
- Timesheet screen shows badge count of pending approvals
- Approval queue: employee name, original vs. requested times, reason, original GPS data
- Actions: **Approve** → `approved_by` set, status `'completed'` · **Reject** → original restored, employee notified · **Edit Further** → override to any values

**Manual Retroactive Entry (foreman/owner only):**
- Timesheet → "+ Add Entry" (role-gated)
- Fields: employee (required), job (required), date (required, no future dates), clock-in time, clock-out time, break minutes, reason (required)
- Saved with `gps_manual = true`, no coordinates, `edit_history` records as retroactive creation

**Split Shifts:** One `time_entries` row per continuous work segment. Multiple entries per user/day are valid and summed for payroll. Overlapping entries are auto-flagged.

### Payroll Export — CSV Column Spec

| # | Column | Source |
|---|--------|--------|
| 1 | `employee_id` | `profiles.id` |
| 2 | `employee_name` | `profiles.full_name` |
| 3 | `role` | `profiles.role` |
| 4 | `work_date` | `clock_in::date` (YYYY-MM-DD) |
| 5 | `job_number` | `jobs.job_number` |
| 6 | `job_name` | `jobs.client_name` |
| 7 | `clock_in` | ISO 8601 timestamp |
| 8 | `clock_out` | ISO 8601 timestamp |
| 9 | `break_minutes` | Sum of all break durations |
| 10 | `regular_hours` | Net hours up to 8.0 |
| 11 | `overtime_hours` | Net hours above 8.0 |
| 12 | `hourly_rate` | `profiles.hourly_rate` |
| 13 | `regular_pay` | regular_hours × rate |
| 14 | `overtime_pay` | OT hours × rate × 1.5 |
| 15 | `entry_status` | Flag if `'flagged'` or `'edited'` |
| 16 | `approved_by_name` | `profiles.full_name` (joined) |
| 17 | `gps_verified` | `NOT gps_manual` |
| 18 | `notes` | `time_entries.notes` |

**Export Edge Function contract:**
```
POST /functions/v1/payroll-export
Body: { start_date, end_date, user_ids?: string[], job_ids?: string[], include_flagged?: boolean }
Response: text/csv  Content-Disposition: attachment; filename="payroll_{start}_{end}.csv"
```

-----

## Feature Spec: Journal & Field Notes

Two distinct note types serve different needs. Both feed the Turf AI data pipeline.

### Two Note Types

| | Field Note | End-of-Day Log |
|---|---|---|
| **When** | Any time during shift | Once, at end of shift |
| **Structure** | Free-form text + category tag | Structured form with required fields |
| **Save behavior** | Auto-saves on keystroke (no Submit button) | Draft until "Submit" is tapped |
| **Editable after** | Yes, by author | Locked on submit; foreman can unlock |
| **Table** | `field_notes` | `daily_logs` |
| **AI value** | Issues, decisions, material notes | Rich structured data — primary training set |

### Field Note (Mid-Shift) User Flow

**Access:** Dashboard FAB (floating action button), any Job Card → Notes tab, or from within Delivery Receive flow

**Screen — New Field Note (bottom sheet, not full screen):**
1. Large text area: placeholder "What's happening?" — max 2000 chars, character counter shown at 1500+
2. Category chips (horizontal row): General / Issue / Material / Safety / Client / Instruction
3. Job context: auto-filled from active assignment or "Select Job" picker
4. Auto-save indicator: "Saved" appears 2 seconds after last keystroke — no Submit button
5. Tap "Done" to dismiss the sheet

**Offline:** Save to local SQLite queue → "Saved locally" indicator → sync on reconnect

**Viewing Notes (Job Card → Notes tab):**
- Pinned notes first, then reverse chronological
- Filter chips: All / Issue / Material / Safety
- Each card: author, timestamp, category badge, body text
- Long-press own note: Edit / Pin / Delete

### End-of-Day Log Form — Field Specs

| Field | Input Type | Required | Validation |
|-------|-----------|----------|------------|
| Job | Picker | ✅ | Active jobs only |
| Date | Date picker | ✅ | Default today; no future dates |
| Temp (°F) | Number | No | 0–130; auto-filled from weather API if available |
| Weather | Picker | No | sunny / cloudy / overcast / rain / wind / fog |
| Ground Condition | Picker | No | dry / damp / muddy / frozen / standing water |
| Stage at Start | Picker | ✅ | Must be a valid stage value |
| Stage at End | Picker | ✅ | Must be ≥ stage at start |
| Sqft Completed | Number | No | 0–99,999 |
| Work Summary | Textarea | ✅ | Min 20 chars, max 2000 chars |
| Issues | Tag/chip input | No | Each tag max 200 chars, max 10 items |
| Decisions Made | Tag/chip input | No | Each tag max 200 chars, max 10 items |
| Lessons Learned | Tag/chip input | No | Each tag max 200 chars, max 5 items |
| Materials Used | Dynamic row list | No | Name + quantity + unit all required per row |
| Photos | Photo picker | No | Max 10 photos; pulls from today's job photos or camera |

**Draft behavior:** Auto-saves to Zustand (persisted to SQLite) every 30 seconds. Draft uploaded as `status = 'draft'` on first keystroke. "Submit" changes status to `'submitted'` — form becomes read-only.

**Lessons Learned UI:** Tag/chip input with prompt "What would you do differently next time?" Each entry is a discrete chip — not a paragraph — because discrete strings are individually embeddable for Turf AI vector search.

### Edit History for Daily Logs

When a submitted log is unlocked and edited, the pre-edit state is snapshotted into `edit_history JSONB` before saving the new state. Format:

```json
[{
  "edited_by": "uuid",
  "edited_at": "timestamptz",
  "snapshot": { "...all field values before this edit..." }
}]
```

Edit history is visible to owner and the log's author. Shown as a collapsed "Edit History" section at the bottom of any submitted log with changes.

-----

## Feature Spec: Field Tools

### Site Prep Checklists (v1 — Week 1 Required)

Checklists are stored as templates in `constants/checklists.ts` and instantiated into the `checklists` table when a job is created or when a foreman taps "Start Checklist."

**New Install — Site Prep Checklist:**
1. Site access confirmed (gate code/contact available)
2. Utilities marked (811 call done or confirmed not needed)
3. Irrigation shut off or capped
4. Existing material removed or demo scheduled
5. Base material delivery confirmed (ETA and quantity)
6. Compaction equipment on site or reserved
7. Drainage pattern assessed and documented
8. Edge/border material staged
9. Adjacent surfaces protected (concrete, planters)
10. Client walkthrough done — starting point agreed

**Rip & Replace additions:** Disposal plan confirmed · Staple/adhesive removal tools on truck · Infill weight estimated for disposal

**Pet Turf additions:** Drainage membrane type confirmed · Deodorizer infill on truck · Perimeter confirmed (pets cannot dig under edges)

**Putting Green additions:** Stimpmeter reading agreed with client · Cup locations confirmed and marked · Fringe turf spec confirmed

**Safety Checklist (every job, every day):**
1. Crew headcount matches assignment
2. First aid kit on truck and accessible
3. Water available (hot weather protocol: mandatory check if temp > 90°F)
4. No overhead hazards in work zone
5. Tool guards in place on power equipment
6. Trip hazards marked with cones
7. PPE distributed (gloves, eye protection)
8. Emergency contact for site posted

**Checklist UI:** Job Card → Checklists tab → list with completion %. Each item: large checkbox (60×60pt), item label, optional "Add Note" per item. Items checked by any assigned crew member — `checked_by` and timestamp auto-recorded. Checklist locked (read-only) once all items are checked.

### Stage Transition UI

**Decision:** Explicit **button** tap (not swipe or picker). Buttons are unambiguous and glove-friendly.

**Display:** Horizontal scrollable chip row. Current stage = highlighted. Completed = checkmark. Future = grayed.

```
[demo_prep ✓] → [base_work ✓] → [compaction ●] → [turf_layout] → ...
```

**Advancing to Next Stage:**
1. Tap the next stage chip
2. Bottom sheet: "Advance to [Stage Name]?"
3. Required: "Stage Notes" text field (min 10 chars) — "What completed [previous stage]?"
4. Optional: attach photos, flag an issue
5. "Confirm Advance" → PATCH `jobs.stage`, INSERT `activity_feed` with stage_notes and photos

**Regression prevention:** Tapping a prior stage shows toast: "Stage transitions are forward-only. Contact your foreman to correct." Foreman/Owner: long-press any chip → "Set as Current Stage" → reason required.

**Stage-Specific Prompts:**

| Advancing To | Additional Prompt |
|---|---|
| `compaction` | Confirm: "Is base material level and to spec?" |
| `turf_layout` | Enter: turf roll numbers being used (text, optional) |
| `seaming` | Picker: seaming method — glue / staple / hybrid |
| `final_walkthrough` | Must initiate the Final Walkthrough checklist first |
| `signed_off` | Client signature capture or "Verbal sign-off — timestamp logged" |

### Delivery Receive Flow

**Step 1 — Confirm Arrival:** Tap "Delivery Is Here" → sets `actual_arrival = now()`

**Step 2 — Item Reconciliation:**

For each expected item, show one row:

| Item | Expected | Received | Status |
|------|---------|---------|--------|
| Turf Roll (60oz Pet) | 8 rolls | [___] | Full / Short / Over / Damaged |
| Zeofill Infill 50lb | 24 bags | [___] | Full / Short / Over / Damaged |

- Received qty defaults to expected qty; user adjusts if different
- If received < expected: status auto-suggests "Short"
- Any "Damaged": `deliveries.status` = `'damaged'` (takes priority)
- Any "Short": `deliveries.status` = `'partial'`; system auto-creates a follow-up delivery row for the shorted items with PO# suffixed `-PARTIAL`

**Step 3 — Photo Documentation (required):**
- "Photo of Delivery Ticket" — cannot proceed without at least one photo
- "Photos of Delivery Condition" — up to 5, optional

**Step 4 — Condition Notes:** Free text, max 500 chars. Pre-fill suggestion chips if damaged: "Torn packaging" / "Bent roll core" / "Wrong spec" / "Water damaged"

**Step 5 — Confirm:** Summary of items, any issues, photo count → "Complete Delivery" → `activity_feed` event logged

### Photo Capture Flow

**Access Points:** Dashboard FAB, Job Card → Photos tab, within Delivery Receive (auto-categorizes as 'delivery'), within Field Note creation

**Camera Screen:**
- Full-screen viewfinder
- Category picker (top): before / during / after / delivery / issue / safety / other
- Job auto-filled from context; picker available if no context
- Camera button: minimum 72pt diameter (glove-accessible)
- Flash toggle for indoor/dark conditions
- After capture: preview → "Use Photo" / "Retake"

**After Capture:**
- Optional caption (max 200 chars)
- GPS auto-tagged from device location
- Compress to max 1MB before upload (`expo-image-manipulator`)
- Progress bar shown during upload
- **Outdoor sunlight**: set device brightness to max while camera is open (`Brightness.setBrightnessAsync(1.0)`)

**Upload Failure Recovery:**
- Photo saved to device camera roll as fallback (with permission)
- Queued for retry on next network connection
- Photos tab badge: "3 pending uploads"

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

### Field Readiness Criteria

A feature that passes the standard DoD above is **done**. A feature that passes the following additional checklist is **field-ready** — meaning safe to put in front of a real crew on a real job site.

**GPS & Location:**
- [ ] Clock-in GPS verified outdoors with clear sky: device-reported accuracy ≤15m
- [ ] Clock-in GPS verified with partial sky obstruction (trees, overhead equipment): accuracy ≤50m
- [ ] Clock-in GPS verified indoors / under metal canopy: if accuracy >100m, app shows a visible warning — never silently records a degraded coordinate
- [ ] Geofence enforcement verified: clock-in attempted from >150m outside the site boundary triggers a crew-visible warning and a flag in the back-office record (geofence radius = **150m** from site center coordinates)
- [ ] Manual GPS fallback tested: records `gps_manual = true`, no lat/lng stored
- [ ] 15-second GPS timeout tested by enabling airplane mode during clock-in flow
- [ ] No feature silently submits a null GPS coordinate — if unavailable, record is flagged "GPS unavailable at time of submission"

**Connectivity:**
- [ ] Feature tested with network throttled to "Slow 3G"
- [ ] Feature tested fully offline (airplane mode)
- [ ] Queued items sync correctly when network is restored
- [ ] No data loss when app is force-killed mid-operation (killed from task switcher while form is open)

**Device & Environment:**
- [ ] All tap targets ≥ 48×48pt; primary actions (clock in/out, submit) ≥ 60×60pt
- [ ] Text readable in direct outdoor sunlight (minimum 4.5:1 contrast ratio; bold weight for primary labels)
- [ ] App tested wearing nitrile work gloves on a physical device (not simulator)
- [ ] App tested on iOS 16 and Android 12 minimum

**Performance:**
- [ ] Clock-in (GPS + DB write) completes in under 10 seconds on LTE
- [ ] Lists with 50+ records scroll at 60fps without jank
- [ ] Photos up to 8MB handled without crash (compression brings to <1MB before upload)

**Data Integrity:**
- [ ] Forms cannot be double-submitted (button disabled immediately on first tap)
- [ ] Time entry overlap detection fires correctly
- [ ] All foreign key constraints enforced — no orphaned records creatable through the UI

-----

## Week 1 Field Test Protocol

### Purpose and Scope

The Week 1 field test is a **structured pilot** with real crew, real jobs, and real stakes. Its goal is to determine whether the app can replace the current workflow (text messages, paper timesheets, verbal EOD reports) — not to find bugs in a staging environment.

**Duration:** 5 working days (Mon–Fri of the pilot week)

**Participants:**
- 1 Owner — observing remotely via dashboard
- 1–2 Foremen — primary users throughout the day
- 3–6 Installers — clock-in/out and photo capture only
- 1 QA observer (can be the developer) — on-site Day 1 and Day 3

### Pre-Test Setup Checklist

All of the following must be true before Day 1:

- [ ] App installed on all participant devices (TestFlight for iOS, APK sideload for Android)
- [ ] All crew accounts created with correct roles assigned
- [ ] At least 2 jobs created in the app with correct addresses and crew assigned
- [ ] Foreman has completed a 15-minute walkthrough of: clock-in, EOD log, delivery receive
- [ ] Owner has tested dashboard access and can see crew status remotely
- [ ] Contingency plan (Section 5D below) communicated to all participants
- [ ] QA observer has Supabase Studio access for real-time data monitoring
- [ ] Nightly validation queries prepared (see Section 5E)

### Daily Test Script

**Day 1 — Morning (7:00–7:30 AM on site)**

| Test Case | Steps | Pass | Fail |
|-----------|-------|------|------|
| TC-01: Clock-in | Each crew member opens app, selects job, taps Clock In | GPS acquired <15s; entry in timesheet | No GPS fallback shown, or entry not saved |
| TC-02: GPS accuracy | QA notes app's reported accuracy vs. known site address | Location within 500m of site | >500m off with no warning |
| TC-03: Stage check | Foreman verifies correct starting stage | Stage matches pre-configured value | Wrong stage or fails to load |
| TC-04: Dashboard | Owner opens dashboard, sees today's jobs and clocked-in crew | Data visible in <5 seconds | Blank or stale data |

**Day 1 — Mid-Morning (10:00 AM)**

| Test Case | Steps | Pass | Fail |
|-----------|-------|------|------|
| TC-05: Break logging | One crew member starts break, ends break 20 min later | Break duration recorded; net hours updated | Break not recorded or can't be ended |
| TC-06: Field note | Foreman taps quick note, types issue, closes sheet | Note in Job Card → Notes tab within 5s | Note lost, not visible, or crash |
| TC-07: Photo capture | Installer takes 3 photos (before, during, safety) | Photos in job gallery with correct categories | Upload fails with no recovery option |

**Day 1 — Delivery**

| Test Case | Steps | Pass | Fail |
|-----------|-------|------|------|
| TC-08: Delivery receive | Foreman opens delivery, reconciles items, photos ticket | Status = 'delivered', photos attached | Cannot complete flow |
| TC-09: Partial delivery | Enter received qty less than expected for one item | Status = 'partial'; follow-up delivery created | No partial handling |

**Day 1 — End of Day (4:30–5:00 PM)**

| Test Case | Steps | Pass | Fail |
|-----------|-------|------|------|
| TC-10: Clock-out | All crew clock out | All entries closed with correct hours | Entry stuck active or hours wrong |
| TC-11: EOD log | Foreman submits end-of-day log | Log submitted, all required fields present | Form crashes or log not saved |
| TC-12: Stage advance | Foreman advances job to next stage with notes | Stage updated in DB, visible on dashboard | Stage not saved or silent failure |

**Days 2–4:** Run repeat scenarios across multiple simultaneous jobs; stress test with crew at different sites; confirm no GPS drift or photo upload degradation under real cellular conditions.

**Day 5 — Exit Review:** QA observer presents live database metrics (row counts, flagged entries, data anomalies). Go / No-Go decision made.

### Pass/Fail Exit Criteria

The Week 1 field test **passes** when ALL of the following are true at end of Day 5:

| Criterion | Target | Data Source |
|-----------|--------|-------------|
| Clock-in completion rate | >95% captured without manual correction | `time_entries` count vs. crew × workdays |
| GPS verification rate | >80% of clock-ins GPS-verified (`gps_manual = false`) | `time_entries` query |
| EOD log submission rate | 100% of working days have a submitted log per active job | `daily_logs.status = 'submitted'` count |
| Data loss incidents | 0 confirmed instances | Participant reports |
| App crash rate | 0 crashes on primary workflows | Participant reports + Expo error logs |
| Crew independence | >80% of crew used app independently on Day 3 without foreman help | QA observation |
| Clock-in speed | Median <90 seconds app open → confirmed clock-in | QA timed observation |

**The test fails** (halt and fix) if:
- Any clock-in is permanently lost and requires manual payroll correction
- Any EOD log is submitted but data is missing/corrupted in the DB
- App crashes more than once per day on primary workflows
- GPS failure rate exceeds 40% on Day 2
- Any partial delivery is recorded as "received" instead of "partial" (affects billing)
- Draft data is lost after an app kill (zero tolerance — even one instance)
- Overtime is calculated incorrectly by more than 15 minutes for any shift

### Crew Confidence Survey

At the end of Day 5, each crew member answers these 5 questions on paper. Score each 1 (strongly disagree) → 5 (strongly agree):

1. I was able to clock in and out without help or confusion.
2. The daily log took less than 5 minutes to complete at end of day.
3. I trust that my time is being recorded correctly.
4. I could use the app effectively in direct sunlight and while wearing gloves.
5. I would use this app every day without being asked to.

**Pass threshold:** Average score ≥ 3.8 across all crew members across all 5 questions. Any single question averaging below 3.0 must be flagged as a UX priority for revision before production rollout, regardless of overall average.

### Contingency / Backup Plan

| App Feature | Fallback Procedure | Who Manages |
|-------------|-------------------|-------------|
| Clock-in fails | Crew texts foreman start time; foreman enters retroactive entry same day | Foreman |
| EOD log fails to submit | Foreman fills paper EOD template (PDF), emails to owner; developer imports manually | Developer |
| Photo upload fails | Photos stay in device camera roll; foreman sends via text/email; developer uploads | Foreman + Developer |
| Delivery receive fails | Foreman photographs ticket, emails owner; status corrected via Supabase Studio | Owner |
| App completely down | Full paper fallback — existing process resumes; post-mortem + fix within 24 hours | Developer |

**Activation threshold:** If any workflow fails for >2 consecutive attempts, activate the corresponding fallback immediately. Do not retry a broken flow during the field test.

**Incident data collection (do this BEFORE restarting or retrying):**
1. Screenshot the current screen including any error message
2. Note exact time and what the crew member was doing immediately before the failure
3. Note device model, OS version, app version (from About screen)
4. Note cellular signal bars and whether Wi-Fi was active
5. Note GPS status (showing location / searching / unavailable)
6. If screen recording is active on the device — stop and save it immediately
7. Post all of the above to the team bug channel within 5 minutes, tagging engineering directly

If data loss is confirmed (a submitted record cannot be found in the system): **stop testing the affected feature immediately** and contact engineering. Do not attempt to re-submit or recreate the lost record until server logs have been reviewed.

### Nightly Data Validation Queries

Run these in Supabase Studio (SQL Editor) at end of each test day:

```sql
-- 1. Orphaned active time entries (open >12hrs — likely forgot to clock out)
SELECT te.id, p.full_name, te.clock_in
FROM time_entries te JOIN profiles p ON te.user_id = p.id
WHERE te.clock_out IS NULL AND te.clock_in < NOW() - INTERVAL '12 hours';

-- 2. Jobs without an EOD log today
SELECT j.job_number, j.client_name
FROM jobs j
WHERE j.status = 'in_progress'
  AND j.id NOT IN (
    SELECT job_id FROM daily_logs WHERE log_date = CURRENT_DATE AND status = 'submitted'
  );

-- 3. Partial deliveries without a follow-up delivery row
SELECT d.id, d.vendor, d.po_number
FROM deliveries d
WHERE d.status = 'partial'
  AND NOT EXISTS (
    SELECT 1 FROM deliveries d2 WHERE d2.po_number = d.po_number || '-PARTIAL'
  );

-- 4. Photos without a job assignment
SELECT COUNT(*) AS orphaned_photos FROM photos WHERE job_id IS NULL;

-- 5. Flagged time entries needing review before next morning
SELECT te.id, p.full_name, te.clock_in, te.clock_out, te.status
FROM time_entries te JOIN profiles p ON te.user_id = p.id
WHERE te.status = 'flagged'
ORDER BY te.clock_in DESC;
```

All five queries should return 0 rows (or expected counts) before the next day begins.

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

## Resolving GitHub Merge Conflicts Quickly

If your PR shows **"This branch has conflicts"**, sync it to the latest base branch before merging:

```bash
npm run sync:main
```

This command runs `scripts/sync-main.sh`, which:
1. fetches `origin/main`
2. rebases your current branch on top of it
3. asks you to resolve any conflicts if they exist
4. force-pushes the rebased branch with `--force-with-lease`

If your base branch is not `main`, run:

```bash
bash scripts/sync-main.sh <base-branch>
```
