-- =====================================================================
-- Planning : events, activities, roles, shifts, assignments
-- =====================================================================

-- Enum statuts d'affectation
create type public.assignment_status as enum ('pending', 'confirmed', 'cancelled', 'checked_in');

-- ---------- events ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_date_order check (end_date >= start_date)
);
create index events_org_idx on public.events(organisation_id);
create index events_dates_idx on public.events(start_date, end_date);

alter table public.events enable row level security;

create policy "Org members can view events"
on public.events for select to authenticated
using (public.is_org_member(auth.uid(), organisation_id));

create policy "Managers can insert events"
on public.events for insert to authenticated
with check (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser']::app_role[]));

create policy "Managers can update events"
on public.events for update to authenticated
using (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser']::app_role[]));

create policy "Managers can delete events"
on public.events for delete to authenticated
using (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser']::app_role[]));

create trigger events_set_updated_at
before update on public.events
for each row execute function public.tg_set_updated_at();

-- ---------- activities ----------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  description text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activities_event_idx on public.activities(event_id);
create index activities_org_idx on public.activities(organisation_id);

alter table public.activities enable row level security;

create policy "Org members can view activities"
on public.activities for select to authenticated
using (public.is_org_member(auth.uid(), organisation_id));

create policy "Managers can insert activities"
on public.activities for insert to authenticated
with check (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser','activity_manager']::app_role[]));

create policy "Managers can update activities"
on public.activities for update to authenticated
using (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser','activity_manager']::app_role[]));

create policy "Managers can delete activities"
on public.activities for delete to authenticated
using (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser','activity_manager']::app_role[]));

create trigger activities_set_updated_at
before update on public.activities
for each row execute function public.tg_set_updated_at();

-- ---------- roles (rôles métier, scopés à l'organisation) ----------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, name)
);
create index roles_org_idx on public.roles(organisation_id);

alter table public.roles enable row level security;

create policy "Org members can view roles"
on public.roles for select to authenticated
using (public.is_org_member(auth.uid(), organisation_id));

create policy "Managers can insert roles"
on public.roles for insert to authenticated
with check (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser']::app_role[]));

create policy "Managers can update roles"
on public.roles for update to authenticated
using (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser']::app_role[]));

create policy "Managers can delete roles"
on public.roles for delete to authenticated
using (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser']::app_role[]));

create trigger roles_set_updated_at
before update on public.roles
for each row execute function public.tg_set_updated_at();

-- ---------- shifts ----------
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  capacity int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shifts_time_order check (end_at > start_at),
  constraint shifts_capacity_positive check (capacity >= 1)
);
create index shifts_activity_idx on public.shifts(activity_id);
create index shifts_org_idx on public.shifts(organisation_id);
create index shifts_role_idx on public.shifts(role_id);
create index shifts_time_idx on public.shifts(start_at);

alter table public.shifts enable row level security;

create policy "Org members can view shifts"
on public.shifts for select to authenticated
using (public.is_org_member(auth.uid(), organisation_id));

create policy "Managers can insert shifts"
on public.shifts for insert to authenticated
with check (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser','activity_manager']::app_role[]));

create policy "Managers can update shifts"
on public.shifts for update to authenticated
using (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser','activity_manager']::app_role[]));

create policy "Managers can delete shifts"
on public.shifts for delete to authenticated
using (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser','activity_manager']::app_role[]));

create trigger shifts_set_updated_at
before update on public.shifts
for each row execute function public.tg_set_updated_at();

-- ---------- assignments ----------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  status public.assignment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, worker_id)
);
create index assignments_shift_idx on public.assignments(shift_id);
create index assignments_worker_idx on public.assignments(worker_id);
create index assignments_org_idx on public.assignments(organisation_id);

alter table public.assignments enable row level security;

create policy "Org members can view assignments"
on public.assignments for select to authenticated
using (public.is_org_member(auth.uid(), organisation_id));

create policy "Managers can insert assignments"
on public.assignments for insert to authenticated
with check (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser','activity_manager']::app_role[]));

create policy "Managers can update assignments"
on public.assignments for update to authenticated
using (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser','activity_manager']::app_role[]));

create policy "Managers can delete assignments"
on public.assignments for delete to authenticated
using (public.has_any_org_role(auth.uid(), organisation_id, array['org_admin','organiser','activity_manager']::app_role[]));

create trigger assignments_set_updated_at
before update on public.assignments
for each row execute function public.tg_set_updated_at();