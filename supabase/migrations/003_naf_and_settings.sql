-- ============================================================
-- 003: NAF (Notepad Activity Feed) entries, attachments & settings
-- ============================================================

-- Unified NAF entries table - everything flows from here
CREATE TABLE IF NOT EXISTS naf_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type   TEXT NOT NULL CHECK (entry_type IN (
    'note','delivery','clock_in','clock_out','checklist','photo','voice_memo','file_upload','general'
  )),
  body         TEXT,                          -- main text content
  job_name     TEXT,                          -- optional job/site reference
  user_id      UUID REFERENCES profiles(id), -- who created it
  ref_id       UUID,                          -- optional FK to related record (time_entry, delivery, etc.)
  ref_table    TEXT,                          -- which table ref_id points to
  metadata     JSONB DEFAULT '{}'::jsonb,     -- flexible extra data (weather, sqft, status, etc.)
  pinned       BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_naf_entries_created ON naf_entries (created_at DESC);
CREATE INDEX idx_naf_entries_type    ON naf_entries (entry_type);
CREATE INDEX idx_naf_entries_job     ON naf_entries (job_name);

-- Attachments linked to NAF entries
CREATE TABLE IF NOT EXISTS naf_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id     UUID NOT NULL REFERENCES naf_entries(id) ON DELETE CASCADE,
  file_type    TEXT NOT NULL CHECK (file_type IN ('photo','video','voice_memo','document','other')),
  file_name    TEXT NOT NULL,
  file_url     TEXT NOT NULL,                 -- Supabase Storage URL or base64 data URI
  file_size    INTEGER,                       -- bytes
  mime_type    TEXT,
  duration_sec INTEGER,                       -- for audio/video
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_naf_attachments_entry ON naf_attachments (entry_id);

-- App-wide settings (key-value with JSON values)
CREATE TABLE IF NOT EXISTS app_settings (
  key          TEXT PRIMARY KEY,
  value        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Job sites registry
CREATE TABLE IF NOT EXISTS job_sites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  address      TEXT,
  client_name  TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','on_hold','cancelled')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_job_sites_status ON job_sites (status);

-- Seed default settings
INSERT INTO app_settings (key, value) VALUES
  ('company', '{"name": "Jobsite Ops HQ", "phone": "", "email": "", "logo_url": ""}'::jsonb),
  ('hours', '{"default_break_minutes": 30, "overtime_threshold": 40, "overtime_rate": 1.5, "pay_period": "weekly", "week_start": "sunday"}'::jsonb),
  ('display', '{"time_format": "12h", "date_format": "MM/DD/YYYY", "theme": "light", "accent_color": "green"}'::jsonb),
  ('notifications', '{"clock_reminder": true, "delivery_alerts": true, "daily_summary": true, "reminder_time": "17:00"}'::jsonb),
  ('naf', '{"default_entry_type": "general", "auto_tag_jobs": true, "show_weather": true, "entries_per_page": 50}'::jsonb)
ON CONFLICT (key) DO NOTHING;
