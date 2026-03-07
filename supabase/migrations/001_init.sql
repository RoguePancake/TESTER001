-- ============================================================
-- Jobsite Operations HQ — MVP Schema
-- Run this in the Supabase SQL Editor to create all tables
-- ============================================================

-- Crew members / 1099 contractors
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'installer' CHECK (role IN ('owner', 'foreman', 'installer', 'laborer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Time card entries
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  job_name TEXT,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 0 CHECK (break_minutes >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily field journal / notepad
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  job_name TEXT,
  weather_condition TEXT CHECK (weather_condition IN ('Sunny', 'Cloudy', 'Rainy', 'Windy', 'Hot', 'Overcast')),
  work_summary TEXT NOT NULL,
  issues TEXT,
  materials_used TEXT,
  sqft_completed INTEGER CHECK (sqft_completed >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_log_date ON daily_logs(log_date DESC);

-- ============================================================
-- Seed: Add your crew here before testing
-- Replace names with your actual 1099 contractors
-- ============================================================
INSERT INTO profiles (full_name, role) VALUES
  ('Owner / You', 'owner'),
  ('Crew Member 1', 'foreman'),
  ('Crew Member 2', 'installer'),
  ('Crew Member 3', 'installer'),
  ('Crew Member 4', 'laborer')
ON CONFLICT DO NOTHING;
