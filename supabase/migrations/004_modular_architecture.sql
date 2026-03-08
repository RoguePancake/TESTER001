-- ============================================================
-- Migration 004: Modular Architecture Upgrade
-- Jobsite Operating System – 12-Engine Architecture
-- ============================================================
-- This migration adds new tables required by the modular engines
-- while PRESERVING all existing tables and columns.
-- ============================================================

-- ── 1. COMPANIES (Identity Engine) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE,                      -- URL-safe company identifier
  owner_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  max_employees  INTEGER NOT NULL DEFAULT 50,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

-- ── 2. PROFILES: add new columns (non-destructive) ───────────────────────────
-- Add auth_id to link profiles to Supabase auth.users
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auth_id    UUID UNIQUE,    -- maps to auth.users.id
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email      TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add CreativeEditor to the allowed role values (no enum change needed,
-- role is already TEXT - just update the check constraint if present)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN ('CreativeEditor','company_owner','owner','field_manager','foreman','installer','laborer','employee')
);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_id    ON profiles(auth_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

-- ── 3. CREWS (Crew Engine) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  foreman_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crews_company_id ON crews(company_id);

-- ── 4. CREW MEMBERS (Crew Engine) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crew_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id     UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crew_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_members_crew_id ON crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user_id ON crew_members(user_id);

-- ── 5. JOB_SITES: add new columns (non-destructive) ──────────────────────────
ALTER TABLE job_sites
  ADD COLUMN IF NOT EXISTS company_id       UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_crew_id UUID REFERENCES crews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_job_sites_company_id ON job_sites(company_id);
CREATE INDEX IF NOT EXISTS idx_job_sites_crew_id    ON job_sites(assigned_crew_id);

-- ── 6. ACTIVITY LOGS (Activity Engine) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID REFERENCES companies(id) ON DELETE SET NULL,
  actor_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  resource_type  TEXT NOT NULL,
  resource_id    UUID,
  previous_data  JSONB,
  new_data       JSONB,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id    ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id      ON activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at    ON activity_logs(created_at DESC);

-- ── 7. NOTIFICATIONS (Notification Engine) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  link        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ── 8. AUTOMATION RULES (Automation Engine) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  trigger     TEXT NOT NULL,
  action      TEXT NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_company ON automation_rules(company_id);

-- ── 9. DAILY_LOGS: add new columns (non-destructive) ─────────────────────────
-- Link journal entries to auth users and companies
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS author_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_id     UUID REFERENCES job_sites(id) ON DELETE SET NULL;

-- ── 10. TIME_ENTRIES: add company linkage (non-destructive) ───────────────────
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- ── ROW LEVEL SECURITY (RLS) ──────────────────────────────────────────────────
-- Enable RLS on new tables to enforce company data isolation.
-- Policies use a helper function to get the current user's company.

-- Enable RLS
ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- Helper: get company_id for the calling auth user
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM profiles WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Helper: get role for the calling auth user
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- COMPANIES: users see only their own company; CreativeEditor sees all
CREATE POLICY "users_see_own_company" ON companies
  FOR SELECT USING (
    id = get_my_company_id()
    OR get_my_role() = 'CreativeEditor'
  );

-- CREWS: scoped to company
CREATE POLICY "crews_company_scope" ON crews
  FOR ALL USING (company_id = get_my_company_id() OR get_my_role() = 'CreativeEditor');

-- CREW MEMBERS: scoped through crew
CREATE POLICY "crew_members_scope" ON crew_members
  FOR ALL USING (
    crew_id IN (SELECT id FROM crews WHERE company_id = get_my_company_id())
    OR get_my_role() = 'CreativeEditor'
  );

-- ACTIVITY LOGS: company-scoped, admins only for write
CREATE POLICY "activity_logs_read" ON activity_logs
  FOR SELECT USING (
    company_id = get_my_company_id()
    OR get_my_role() = 'CreativeEditor'
  );

CREATE POLICY "activity_logs_insert" ON activity_logs
  FOR INSERT WITH CHECK (true);  -- engine handles auth, insert is unrestricted

-- NOTIFICATIONS: each user sees only their own
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (
    user_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
  );

-- AUTOMATION RULES: company-scoped
CREATE POLICY "automation_company_scope" ON automation_rules
  FOR ALL USING (company_id = get_my_company_id() OR get_my_role() = 'CreativeEditor');

-- ── SEED: default automation rules (optional) ─────────────────────────────────
-- (Uncomment when a real company exists)
-- INSERT INTO automation_rules (name, trigger, action, config) VALUES
--   ('Daily Time Reminder', 'end_of_day', 'notify_all_employees', '{"hour": 17}'),
--   ('Missing Clock-Out Alert', 'missing_clock_out', 'notify_employee', '{"hours_threshold": 10}');
