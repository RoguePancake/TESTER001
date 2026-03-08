-- ============================================================
-- Migration 002: Deliveries + Checklist completions
-- Run in Supabase SQL Editor after 001_init.sql
-- ============================================================

-- Delivery logs
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  job_name TEXT,
  vendor TEXT NOT NULL,
  po_number TEXT,
  items_received TEXT NOT NULL,   -- plain text list of what arrived
  status TEXT DEFAULT 'delivered' CHECK (status IN (
    'scheduled', 'delivered', 'partial', 'damaged', 'cancelled'
  )),
  condition_notes TEXT,
  received_by TEXT,               -- crew member name (no FK required for MVP)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Checklist completions (one row per checked item per job per day)
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checklist_type TEXT NOT NULL CHECK (checklist_type IN (
    'site_prep', 'safety', 'final_walkthrough'
  )),
  item_label TEXT NOT NULL,
  checked_by TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_checklist_items_job_date ON checklist_items(job_name, check_date);
