-- Migration 006: Invite Codes
-- Enables gated registration for soft-launch / beta periods.
-- Admins generate single-use codes; users enter them during signup.
-- When not in beta mode, the gate can be toggled off in app_settings.

-- ── Table ──────────────────────────────────────────────────────────────────────
create table if not exists invite_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  created_by    uuid references profiles(id) on delete set null,
  used_by       uuid references profiles(id) on delete set null,
  used_at       timestamptz,
  expires_at    timestamptz,                    -- null = never expires
  max_uses      int not null default 1,         -- 1 = single-use
  use_count     int not null default 0,
  note          text,                           -- e.g. "Reddit beta batch 1"
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
create index if not exists invite_codes_code_idx on invite_codes (code);
create index if not exists invite_codes_active_idx on invite_codes (is_active, use_count, max_uses);

-- ── Row Level Security ─────────────────────────────────────────────────────────
alter table invite_codes enable row level security;

-- Only company_owner and CreativeEditor can manage codes
create policy "admins_manage_invite_codes"
  on invite_codes
  for all
  using (
    exists (
      select 1 from profiles
      where auth_id = auth.uid()
        and role in ('CreativeEditor', 'company_owner')
    )
  );

-- Public can validate a code (read-only, code lookup)
create policy "public_validate_invite_code"
  on invite_codes
  for select
  using (true);

-- ── Helper function: validate and consume an invite code ──────────────────────
-- Returns true if code was valid and consumed, false otherwise.
-- Call this from your signup API route before creating the user.
create or replace function consume_invite_code(p_code text, p_profile_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  -- Lock and fetch a valid, unused code
  select id into v_id
  from invite_codes
  where code = p_code
    and is_active = true
    and use_count < max_uses
    and (expires_at is null or expires_at > now())
  for update skip locked
  limit 1;

  if v_id is null then
    return false;
  end if;

  -- Consume it
  update invite_codes
  set
    use_count  = use_count + 1,
    used_by    = case when max_uses = 1 then p_profile_id else used_by end,
    used_at    = case when max_uses = 1 then now() else used_at end,
    is_active  = case when use_count + 1 >= max_uses then false else true end
  where id = v_id;

  return true;
end;
$$;

-- ── Seed: example codes for first Reddit batch ────────────────────────────────
-- Remove or replace these before launch. Generate real codes in the Admin panel.
-- insert into invite_codes (code, note, max_uses) values
--   ('BETA-REDDIT-001', 'Reddit soft launch batch 1', 1),
--   ('BETA-REDDIT-002', 'Reddit soft launch batch 1', 1),
--   ('BETA-REDDIT-003', 'Reddit soft launch batch 1', 1);
