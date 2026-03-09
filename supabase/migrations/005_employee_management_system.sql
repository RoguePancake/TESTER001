-- ============================================================
-- Migration 005: Employee Management System
-- Adds professional employee profiles, pay rate tracking,
-- job assignments, payroll summaries, and timesheet approvals.
-- ============================================================

-- ── 1. PROFILES: Expand with employee management fields ─────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS hire_date          DATE,
  ADD COLUMN IF NOT EXISTS employment_type    TEXT DEFAULT 'employee'
    CHECK (employment_type IN ('employee', 'contractor', 'temp')),
  ADD COLUMN IF NOT EXISTS employment_status  TEXT DEFAULT 'active'
    CHECK (employment_status IN ('active', 'inactive', 'terminated', 'on_leave', 'probation')),
  ADD COLUMN IF NOT EXISTS default_pay_rate   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS overtime_rule      TEXT DEFAULT 'standard'
    CHECK (overtime_rule IN ('standard', 'none', 'california', 'custom')),
  ADD COLUMN IF NOT EXISTS overtime_threshold NUMERIC(5,1) DEFAULT 40.0,
  ADD COLUMN IF NOT EXISTS address            TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS certifications     JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS skill_tags         JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS employee_notes     TEXT,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ;

-- Index for common employee queries
CREATE INDEX IF NOT EXISTS idx_profiles_employment_status ON profiles(employment_status);
CREATE INDEX IF NOT EXISTS idx_profiles_employment_type   ON profiles(employment_type);
CREATE INDEX IF NOT EXISTS idx_profiles_hire_date         ON profiles(hire_date);

-- ── 2. PAY RATES: Track rate history and job-specific overrides ─────────────
CREATE TABLE IF NOT EXISTS pay_rates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rate           NUMERIC(10,2) NOT NULL,
  rate_type      TEXT NOT NULL DEFAULT 'hourly'
    CHECK (rate_type IN ('hourly', 'salary', 'flat', 'per_sqft')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date       DATE,
  job_id         UUID REFERENCES job_sites(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pay_rates_employee    ON pay_rates(employee_id);
CREATE INDEX IF NOT EXISTS idx_pay_rates_job         ON pay_rates(job_id);
CREATE INDEX IF NOT EXISTS idx_pay_rates_effective   ON pay_rates(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_pay_rates_active      ON pay_rates(employee_id, effective_date DESC)
  WHERE end_date IS NULL;

-- ── 3. JOB ASSIGNMENTS: Link employees to jobs with roles ───────────────────
CREATE TABLE IF NOT EXISTS job_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id         UUID NOT NULL REFERENCES job_sites(id) ON DELETE CASCADE,
  role_on_job    TEXT DEFAULT 'installer',
  assigned_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date       DATE,
  assigned_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, job_id, assigned_date)
);

CREATE INDEX IF NOT EXISTS idx_job_assignments_employee ON job_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_job      ON job_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_active   ON job_assignments(is_active)
  WHERE is_active = true;

-- ── 4. TIME ENTRIES: Add job linking, pay snapshot, approval workflow ────────
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS job_id              UUID REFERENCES job_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pay_rate_snapshot   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS overtime_rate_snapshot NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS approved_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status              TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'disputed')),
  ADD COLUMN IF NOT EXISTS work_type           TEXT,
  ADD COLUMN IF NOT EXISTS travel_time         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weather             TEXT,
  ADD COLUMN IF NOT EXISTS equipment_used      TEXT,
  ADD COLUMN IF NOT EXISTS location_note       TEXT,
  ADD COLUMN IF NOT EXISTS sqft_completed      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS materials_used      TEXT,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_time_entries_job_id   ON time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status   ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_approved ON time_entries(approved_by);

-- ── 5. PAYROLL SUMMARIES: Period-based payroll snapshots ────────────────────
CREATE TABLE IF NOT EXISTS payroll_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  regular_hours   NUMERIC(8,2) NOT NULL DEFAULT 0,
  overtime_hours  NUMERIC(8,2) NOT NULL DEFAULT 0,
  regular_rate    NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtime_rate   NUMERIC(10,2) NOT NULL DEFAULT 0,
  gross_pay       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_entries   INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'approved', 'finalized', 'paid')),
  notes           TEXT,
  finalized_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  finalized_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ,
  UNIQUE (employee_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll_summaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period   ON payroll_summaries(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_status   ON payroll_summaries(status);

-- ── 6. CREW MEMBERS: Add role on crew ───────────────────────────────────────
ALTER TABLE crew_members
  ADD COLUMN IF NOT EXISTS crew_role TEXT DEFAULT 'member'
    CHECK (crew_role IN ('member', 'lead', 'foreman', 'apprentice'));

-- ── 7. RLS Policies for new tables ──────────────────────────────────────────

ALTER TABLE pay_rates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_summaries ENABLE ROW LEVEL SECURITY;

-- Pay rates: company-scoped
CREATE POLICY "pay_rates_company_scope" ON pay_rates
  FOR ALL USING (
    employee_id IN (SELECT id FROM profiles WHERE company_id = get_my_company_id())
    OR get_my_role() = 'CreativeEditor'
  );

-- Job assignments: company-scoped
CREATE POLICY "job_assignments_company_scope" ON job_assignments
  FOR ALL USING (
    employee_id IN (SELECT id FROM profiles WHERE company_id = get_my_company_id())
    OR get_my_role() = 'CreativeEditor'
  );

-- Payroll summaries: company-scoped, admins only
CREATE POLICY "payroll_read" ON payroll_summaries
  FOR SELECT USING (
    employee_id IN (SELECT id FROM profiles WHERE company_id = get_my_company_id())
    OR get_my_role() = 'CreativeEditor'
  );

CREATE POLICY "payroll_write" ON payroll_summaries
  FOR INSERT WITH CHECK (
    get_my_role() IN ('CreativeEditor', 'company_owner')
  );

CREATE POLICY "payroll_update" ON payroll_summaries
  FOR UPDATE USING (
    get_my_role() IN ('CreativeEditor', 'company_owner')
  );
