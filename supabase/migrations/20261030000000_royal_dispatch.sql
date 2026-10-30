-- The Royal Dispatch — schema, constraints and row-level security.
-- All content is fictional. Apply with `supabase db push` or the SQL editor,
-- then run supabase/seed.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------
create type public.app_role as enum ('citizen', 'steward', 'admin');
create type public.incident_status as enum ('submitted', 'acknowledged', 'in_restoration', 'resolved');
create type public.incident_severity as enum ('low', 'moderate', 'high', 'critical');
create type public.incident_category as enum (
  'magical_anomaly', 'cursed_artifact', 'water_food', 'roads',
  'communication', 'wards', 'shelter_healing', 'other'
);
create type public.village_condition as enum ('stable', 'strained', 'afflicted', 'critical');
create type public.announcement_priority as enum ('routine', 'advisory', 'urgent', 'critical');
create type public.announcement_category as enum ('wards', 'roads', 'water', 'council', 'curse', 'relief');
create type public.publication_state as enum ('published', 'archived');

-- ---------------------------------------------------------------------
-- Profiles & roles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Citizen' check (char_length(display_name) between 1 and 80),
  role public.app_role not null default 'citizen',
  created_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'citizen'::public.app_role);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select public.current_app_role() in ('steward', 'admin'); $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select public.current_app_role() = 'admin'; $$;

-- Every new auth user gets a citizen profile. Promotion is done by an admin
-- (or in the SQL editor), never by the user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and current_user in ('anon', 'authenticated') and not public.is_admin() then
    raise exception 'Only the Royal Council may change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------------
-- Villages
-- ---------------------------------------------------------------------
create table public.villages (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  epithet text not null,
  description text not null check (char_length(description) between 20 and 600),
  condition public.village_condition not null,
  services jsonb not null check (
    services ?& array['communications', 'roads', 'water', 'food', 'wards']
  ),
  restoration integer not null check (restoration between 0 and 100),
  map_x numeric(5, 2) not null check (map_x between 0 and 100),
  map_y numeric(5, 2) not null check (map_y between 0 and 100),
  updated_at timestamptz not null default now()
);

create table public.village_updates (
  id uuid primary key default gen_random_uuid(),
  village_id text not null references public.villages (id) on delete cascade,
  message text not null check (char_length(message) between 8 and 400),
  author_name text not null,
  restoration integer not null check (restoration between 0 and 100),
  created_at timestamptz not null default now()
);
create index village_updates_village_idx on public.village_updates (village_id, created_at);

-- Stewards may set restoration progress; only admins may edit the record itself.
create or replace function public.guard_village_update()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() and (
    new.name is distinct from old.name or
    new.epithet is distinct from old.epithet or
    new.description is distinct from old.description or
    new.condition is distinct from old.condition or
    new.services is distinct from old.services or
    new.map_x is distinct from old.map_x or
    new.map_y is distinct from old.map_y
  ) then
    raise exception 'Only the Royal Council may edit village records';
  end if;
  return new;
end;
$$;

create trigger villages_guard_update
  before update on public.villages
  for each row execute function public.guard_village_update();

-- ---------------------------------------------------------------------
-- Incidents
-- ---------------------------------------------------------------------
create sequence public.incident_reference_seq start with 41;

create or replace function public.next_incident_reference()
returns text language sql volatile
as $$
  select 'KNG-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.incident_reference_seq')::text, 4, '0');
$$;

create table public.incidents (
  id text primary key default ('inc_' || replace(gen_random_uuid()::text, '-', '')),
  -- Assigned by the incidents_prepare_insert trigger.
  reference text not null unique,
  title text not null check (char_length(title) between 6 and 120),
  description text not null check (char_length(description) between 30 and 2000),
  category public.incident_category not null,
  severity public.incident_severity not null,
  village_id text not null references public.villages (id),
  location text not null check (char_length(location) between 3 and 140),
  status public.incident_status not null default 'submitted',
  anonymous boolean not null default false,
  reporter_name text check (reporter_name is null or char_length(reporter_name) <= 60),
  reporter_id uuid references auth.users (id) on delete set null,
  assigned_team text,
  attachment_data_url text check (
    attachment_data_url is null or (
      char_length(attachment_data_url) <= 450000 and
      attachment_data_url ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$'
    )
  ),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anonymous_reports_have_no_name check (not anonymous or reporter_name is null)
);
create index incidents_village_idx on public.incidents (village_id);
create index incidents_status_idx on public.incidents (status);

create table public.incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id text not null references public.incidents (id) on delete cascade,
  kind text not null check (kind in ('submitted', 'status', 'note', 'assignment')),
  message text not null check (char_length(message) between 1 and 800),
  author_name text not null,
  author_role text not null check (author_role in ('citizen', 'steward', 'admin', 'system')),
  from_status public.incident_status,
  to_status public.incident_status,
  created_at timestamptz not null default now()
);
create index incident_updates_incident_idx on public.incident_updates (incident_id, created_at);

-- Citizens can only ever create a fresh, unassigned, submitted report.
-- The reference, timestamps and reporter id are set by the database.
create or replace function public.prepare_citizen_incident()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') or new.reference is null then
    new.reference := public.next_incident_reference();
  end if;
  if current_user in ('anon', 'authenticated') then
    new.status := 'submitted';
    new.assigned_team := null;
    new.reporter_id := auth.uid();
    new.submitted_at := now();
    new.updated_at := now();
    if new.anonymous then new.reporter_name := null; end if;
  end if;
  return new;
end;
$$;

create trigger incidents_prepare_insert
  before insert on public.incidents
  for each row execute function public.prepare_citizen_incident();

create or replace function public.log_incident_received()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    insert into public.incident_updates (incident_id, kind, message, author_name, author_role, created_at)
    values (new.id, 'submitted', 'Report received by the Royal Dispatch.', 'The Royal Dispatch', 'system', new.submitted_at);
  end if;
  return new;
end;
$$;

create trigger incidents_log_received
  after insert on public.incidents
  for each row execute function public.log_incident_received();

-- ---------------------------------------------------------------------
-- Announcements (Royal Dispatches)
-- ---------------------------------------------------------------------
create table public.announcements (
  id text primary key default ('dsp_' || replace(gen_random_uuid()::text, '-', '')),
  title text not null check (char_length(title) between 6 and 120),
  summary text not null check (char_length(summary) between 12 and 220),
  body text not null check (char_length(body) between 30 and 4000),
  priority public.announcement_priority not null,
  category public.announcement_category not null,
  village_id text references public.villages (id),
  issued_by text not null check (char_length(issued_by) between 3 and 80),
  author_id uuid references auth.users (id) on delete set null,
  published_at timestamptz not null default now(),
  state public.publication_state not null default 'published'
);
create index announcements_published_idx on public.announcements (state, published_at desc);

-- ---------------------------------------------------------------------
-- Restoration initiatives
-- ---------------------------------------------------------------------
create table public.initiatives (
  id text primary key,
  title text not null,
  summary text not null,
  village_id text not null references public.villages (id),
  lead text not null,
  incident_ids text[] not null default '{}',
  next_steps text[] not null default '{}'
);

create table public.initiative_milestones (
  id text primary key,
  initiative_id text not null references public.initiatives (id) on delete cascade,
  title text not null,
  position integer not null,
  done boolean not null default false,
  done_at timestamptz
);

create table public.initiative_updates (
  id uuid primary key default gen_random_uuid(),
  initiative_id text not null references public.initiatives (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 600),
  author_name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- The Grimoire and kingdom events
-- ---------------------------------------------------------------------
create table public.artifacts (
  id text primary key,
  name text not null,
  epithet text not null,
  glyph text not null check (glyph in ('lantern', 'codex', 'bell', 'compass', 'hourglass')),
  origin text not null,
  description text not null,
  lore text not null,
  disaster text not null,
  containment text not null,
  village_id text not null references public.villages (id),
  incident_ids text[] not null default '{}'
);

create table public.kingdom_events (
  key text primary key,
  occurred_at timestamptz not null default now()
);

-- The awakening surfaces two incidents and one dispatch exactly once,
-- whichever browser's curse clock reaches zero first. Idempotent.
create or replace function public.apply_awakening()
returns void language plpgsql security definer set search_path = public
as $$
declare
  inserted integer;
begin
  insert into public.kingdom_events (key) values ('sleeper-awakened') on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;

  with surfaced as (
    insert into public.incidents (reference, title, description, category, severity, village_id, location, anonymous, reporter_name)
    values
      (public.next_incident_reference(),
       'The barrow-stones beneath Kingsfall Downs have split',
       'At the moment the curse clock reached zero, the capstone of the Sleeper''s barrow cracked from end to end. Cold air is pouring from the opening and the grass around it has turned grey. The Watch has drawn a cordon but no one will go nearer.',
       'magical_anomaly', 'critical', 'kingsfall', 'The Sleeper''s Barrow, Kingsfall Downs', false, 'Watch of the Barrow'),
      (public.next_incident_reference(),
       'Every clock in Moonfall stopped at 13:04',
       'Every clock, sundial and hourglass in Moonfall has stopped at the same moment, reading thirteen and four. The midnight bells rang once more and then fell silent. People are gathering in the square and asking what it means.',
       'magical_anomaly', 'high', 'moonfall', 'Moonfall village square', false, 'Beacon-keeper Rhosyn')
    returning id
  )
  insert into public.incident_updates (incident_id, kind, message, author_name, author_role)
  select id, 'submitted', 'Raised automatically by the Watch when the Sleeper awakened.', 'The Royal Dispatch', 'system'
  from surfaced;

  insert into public.announcements (id, title, summary, body, priority, category, village_id, issued_by)
  values (
    'dsp-the-sleeper-has-awakened',
    'The Sleeper has awakened',
    'The barrow beneath Kingsfall Downs has opened. Kirmada stirs. Report every new disturbance to the Dispatch at once.',
    E'The curse clock has run out. At that moment the capstone of the barrow beneath Kingsfall Downs split, and every clock in Moonfall stopped.\n\nThe Council now believes the Sleeper is Kirmada himself, who did not die at the Battle of Kingsfall Downs but bound himself in sleep with the artifacts scattered across the kingdom.\n\nAll citizens: stay within lamplight after dusk. Do not approach the Downs. Report every new disturbance to the Royal Dispatch — every signal matters now more than ever.\n\nThe Dispatch remains open. Your reports and every restoration effort already under way continue unchanged.',
    'critical', 'curse', null, 'The Royal Council'
  )
  on conflict (id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.villages enable row level security;
alter table public.village_updates enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_updates enable row level security;
alter table public.announcements enable row level security;
alter table public.initiatives enable row level security;
alter table public.initiative_milestones enable row level security;
alter table public.initiative_updates enable row level security;
alter table public.artifacts enable row level security;
alter table public.kingdom_events enable row level security;

-- Profiles: users see themselves; the Council sees everyone.
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: update own name" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Public reference data.
create policy "villages: public read" on public.villages for select to anon, authenticated using (true);
create policy "villages: staff update" on public.villages for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "village updates: public read" on public.village_updates for select to anon, authenticated using (true);
create policy "village updates: staff insert" on public.village_updates for insert to authenticated
  with check (public.is_staff());

-- Incidents: the registry is public; anyone may file; only staff may change.
create policy "incidents: public read" on public.incidents for select to anon, authenticated using (true);
create policy "incidents: anyone may file" on public.incidents for insert to anon, authenticated
  with check (status = 'submitted' and assigned_team is null);
create policy "incidents: staff update" on public.incidents for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Hide the reporter's account id from the public registry.
revoke select on public.incidents from anon, authenticated;
grant select (
  id, reference, title, description, category, severity, village_id, location, status,
  anonymous, reporter_name, assigned_team, attachment_data_url, submitted_at, updated_at
) on public.incidents to anon, authenticated;

create policy "incident updates: public read" on public.incident_updates for select to anon, authenticated using (true);
create policy "incident updates: staff insert" on public.incident_updates for insert to authenticated
  with check (public.is_staff() and author_role in ('steward', 'admin'));

-- Announcements: published are public; archived are staff-only.
create policy "announcements: read published" on public.announcements for select to anon, authenticated
  using (state = 'published' or public.is_staff());
create policy "announcements: publish" on public.announcements for insert to authenticated
  with check (public.is_admin() or (public.is_staff() and village_id is not null));
create policy "announcements: admin update" on public.announcements for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Restoration.
create policy "initiatives: public read" on public.initiatives for select to anon, authenticated using (true);
create policy "milestones: public read" on public.initiative_milestones for select to anon, authenticated using (true);
create policy "milestones: staff update" on public.initiative_milestones for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "initiative updates: public read" on public.initiative_updates for select to anon, authenticated using (true);
create policy "initiative updates: staff insert" on public.initiative_updates for insert to authenticated
  with check (public.is_staff());

create policy "artifacts: public read" on public.artifacts for select to anon, authenticated using (true);
create policy "events: public read" on public.kingdom_events for select to anon, authenticated using (true);

grant usage on sequence public.incident_reference_seq to anon, authenticated;
grant execute on function public.apply_awakening() to anon, authenticated;
grant execute on function public.next_incident_reference() to anon, authenticated;
