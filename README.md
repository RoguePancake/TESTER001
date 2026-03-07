# Jobsite Operations HQ

**Your AI-Powered Field Operations Command Center for Artificial Turf Installation**

> From first clock-in to last clock-out — every hour tracked, every delivery logged, every job prepped, every decision recorded. One app. Every platform. Zero gaps.

-----

## Vision

Jobsite Operations HQ is a cross-platform personal assistant built for the field superintendent / operations lead running day-to-day artificial turf installation jobs. It captures **every data point** from the moment you start your day — crew hours, material deliveries, job progress, weather conditions, site photos, scheduling changes — and stores it permanently. The long-term goal: build a proprietary dataset that powers a **Turf AI** capable of answering any operational question a seasoned installer would know.

-----

## Table of Contents

1. [Core Features](#core-features)
1. [Architecture Overview](#architecture-overview)
1. [Tech Stack (Recommended)](#tech-stack)
1. [Database Schema](#database-schema)
1. [Authentication & Roles](#authentication--roles)
1. [Module Breakdown](#module-breakdown)
1. [Data Collection Strategy](#data-collection-strategy)
1. [AI / Future Intelligence Layer](#ai--future-intelligence-layer)
1. [Weekend Build Plan](#weekend-build-plan)
1. [Deployment & Publishing](#deployment--publishing)
1. [File & Folder Structure](#file-structure)

-----

## Core Features

### Daily Operations Loop

- **Clock-In / Clock-Out System** — GPS-stamped, photo-verified time tracking for you and your entire crew. Automatic break tracking. Overtime flags.
- **Morning Briefing Generator** — Auto-generated daily brief: today’s jobs, crew assignments, expected deliveries, weather alerts, yesterday’s carryover tasks.
- **End-of-Day Report** — One-tap daily summary: hours worked, tasks completed, materials used, issues flagged, photos captured. Auto-saved and exportable.

### Personnel Management

- **Crew Roster** — Full employee directory with roles, certifications, hourly rates, emergency contacts.
- **Time Tracking Dashboard** — Real-time view of who’s clocked in, where, and for how long. Weekly/biweekly payroll summaries.
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
- **Client Updates** — One-tap status updates to clients: “Crew is on site,” “Job 50% complete,” “Final walkthrough ready.”
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

## Module Breakdown

### Module 1: Command Center (Dashboard)

The home screen. Everything at a glance.

**Components:**

- `TodayBrief` — Auto-generated morning briefing (jobs, crew, deliveries, weather)
- `ActiveTimers` — Who’s clocked in right now, live elapsed time
- `TodaySchedule` — Timeline view of today’s jobs with status indicators
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
- `SkillMatrix` — Visual grid of who’s certified for what.
- `CrewAvailability` — Calendar view of who’s available when.

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
- Simple pattern alerts: “You typically need 2 extra infill bags for jobs over 1,500 sqft”

### Phase 2: Predictive Operations (3-6 Months)

- **Job Duration Predictor** — Based on historical data: sqft, job type, crew size, weather → estimated completion time
- **Crew Optimizer** — Best crew combination for job type based on past performance
- **Material Estimator** — Auto-calculate materials needed based on sqft and job type
- **Weather Impact Model** — How weather patterns affect job timelines in your region

### Phase 3: Turf AI (6-12 Months)

- **Natural Language Queries** — “How long did pet turf jobs over 2,000 sqft take on average last summer?”
- **Decision Support** — “Should I schedule this outdoor job for Thursday? Here’s the weather forecast and your historical rain-delay data.”
- **Training Tool** — New hires can ask the AI questions and get answers based on your years of logged operational knowledge.
- **Bid Intelligence** — “Based on 47 similar jobs, your average cost per sqft for putting greens is $X. Your bid should be at least $Y.”

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

## Weekend Build Plan

### Saturday Night (Tonight) — Foundation

|Time        |Task               |Goal                                                  |
|------------|-------------------|------------------------------------------------------|
|**8:00 PM** |Project setup      |Expo init, Supabase project, connect                  |
|**9:00 PM** |Auth system        |Login/signup screens, session management              |
|**10:00 PM**|Database schema    |Run all CREATE TABLE migrations                       |
|**10:30 PM**|Navigation skeleton|Tab navigator: Dashboard, Time, Jobs, Deliveries, More|
|**11:30 PM**|Clock in/out       |Working time clock with GPS                           |
|**1:00 AM** |Job cards          |Create/view/edit jobs. Basic job list.                |
|**2:30 AM** |Break / review     |Test auth + clock + jobs flow end to end              |

### Sunday — Features & Polish

|Time        |Task            |Goal                                             |
|------------|----------------|-------------------------------------------------|
|**9:00 AM** |Morning briefing|Auto-generated dashboard with today’s schedule   |
|**10:30 AM**|Crew assignments|Assign crew to jobs. View who’s where.           |
|**12:00 PM**|Delivery tracker|Log and track deliveries per job                 |
|**1:00 PM** |Lunch break     |                                                 |
|**2:00 PM** |Photo capture   |In-app camera, GPS-tagged, tied to jobs          |
|**3:30 PM** |Daily log form  |End-of-day data entry: summary, issues, decisions|
|**5:00 PM** |Checklists      |Site prep and walkthrough checklists             |
|**6:30 PM** |Polish & test   |UI cleanup, error handling, test all flows       |
|**8:00 PM** |Build & deploy  |Expo build for iOS/Android. Deploy web to Vercel.|
|**9:00 PM** |Seed test data  |Add real crew, real jobs for Monday field test   |

### Priority Order (If Time Runs Short)

1. ✅ Auth + Login (must have)
1. ✅ Clock In/Out (must have)
1. ✅ Job Cards (must have)
1. ✅ Dashboard / Today View (must have)
1. ⬜ Crew Assignments (important)
1. ⬜ Delivery Tracking (important)
1. ⬜ Photo Capture (nice to have for v1)
1. ⬜ Daily Logs (nice to have for v1)
1. ⬜ Reports (can add next week)
1. ⬜ Checklists (can add next week)

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
├── assets/                       # Images, fonts, icons
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── tailwind.config.js            # NativeWind config
├── tsconfig.json
├── package.json
└── README.md                     # ← You are here
```

-----

## Key Tips for the Weekend Build

1. **Start with the data model, not the UI.** Get your Supabase tables right first. Everything else is just forms and lists on top of good data.
1. **Use Supabase’s auto-generated TypeScript types.** Run `supabase gen types typescript` and you get type-safe database queries for free.
1. **Don’t build auth from scratch.** Supabase Auth handles passwords, sessions, JWTs, password reset, and SSO. Just wrap it in your UI.
1. **Offline-first matters in the field.** Job sites have bad signal. Use WatermelonDB or Expo SQLite to cache locally and sync when online. Even a simple queue of pending writes saves you.
1. **GPS clock-in is non-negotiable.** If a guy says he’s on site, the GPS should confirm it. Expo Location makes this easy.
1. **Photos are your most valuable data.** Before/after photos win warranty disputes, impress clients, and train AI. Make the camera one tap from anywhere.
1. **Log decisions, not just events.** “We moved the crew from Job A to Job B because the base rock delivery was delayed” — that’s the kind of context that makes Turf AI actually smart.
1. **Ship ugly, then polish.** A working app in the field Monday beats a pretty app that’s still in dev. Get the data flowing first.

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

-----

## License

Proprietary — All rights reserved.

-----

*Built for the field, by someone who knows what it’s like to run a crew, juggle deliveries, and still need to know what’s happening on three job sites at once.*