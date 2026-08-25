-- Run once in the Supabase SQL editor for your project (Dashboard -> SQL Editor -> New query).

-- One row per signed-in person: what name they show on the vote buttons, and
-- (for presence) when they were last seen and which activity they're on.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  updated_at timestamptz not null default now(),
  last_seen timestamptz,
  active_stop_id text
);

-- Safe to re-run: adds these two columns to a profiles table created before
-- presence existed. No-ops if they're already there.
alter table public.profiles add column if not exists last_seen timestamptz;
alter table public.profiles add column if not exists active_stop_id text;

alter table public.profiles enable row level security;

-- Postgres has no "create policy if not exists", so drop-then-create is what
-- makes this whole file safe to paste and run again on a project that
-- already has these policies (a plain "create policy" would fail on the
-- name collision — and since the SQL editor runs a pasted script as one
-- implicit transaction, that failure rolls back every statement before it
-- in the same run too, including any column additions above).
drop policy if exists "profiles are viewable by any signed-in user" on public.profiles;
create policy "profiles are viewable by any signed-in user"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "users can create their own profile" on public.profiles;
create policy "users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Single shared row holding the whole trip plan as JSON (same shape the original
-- artifact used: title, sub, budget, startDate, votes, pins, regions).
create table if not exists public.trip_state (
  id text primary key,
  data jsonb not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

alter table public.trip_state enable row level security;

drop policy if exists "trip state is viewable by any signed-in user" on public.trip_state;
create policy "trip state is viewable by any signed-in user"
  on public.trip_state for select
  to authenticated
  using (true);

drop policy if exists "trip state is editable by any signed-in user" on public.trip_state;
create policy "trip state is editable by any signed-in user"
  on public.trip_state for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "trip state can be seeded by any signed-in user" on public.trip_state;
create policy "trip state can be seeded by any signed-in user"
  on public.trip_state for insert
  to authenticated
  with check (true);

-- No need to insert a starting row here — the app seeds the default itinerary
-- itself the first time anyone signs in and finds the row missing.
--
-- No Realtime setup needed: the app polls trip_state and profiles every few
-- seconds instead of subscribing to postgres_changes.
