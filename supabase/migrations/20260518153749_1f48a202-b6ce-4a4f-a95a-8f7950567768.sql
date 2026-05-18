
-- ========== ENUM rôles ==========
create type public.app_role as enum (
  'platform_admin',
  'org_admin',
  'organiser',
  'activity_manager',
  'worker'
);

-- ========== profiles ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- ========== organisations ==========
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organisations enable row level security;

-- ========== memberships ==========
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, organisation_id)
);

alter table public.memberships enable row level security;

-- ========== SECURITY DEFINER helpers (évite la récursion RLS) ==========
create or replace function public.has_org_role(_user_id uuid, _org_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = _user_id and organisation_id = _org_id and role = _role
  )
$$;

create or replace function public.is_org_member(_user_id uuid, _org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = _user_id and organisation_id = _org_id
  )
$$;

create or replace function public.has_any_org_role(_user_id uuid, _org_id uuid, _roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = _user_id and organisation_id = _org_id and role = any(_roles)
  )
$$;

-- ========== organisations policies ==========
create policy "Members can view their organisations"
  on public.organisations for select
  to authenticated
  using (public.is_org_member(auth.uid(), id));

create policy "Any authenticated user can create an organisation"
  on public.organisations for insert
  to authenticated
  with check (true);

create policy "Org admins can update their organisation"
  on public.organisations for update
  to authenticated
  using (public.has_org_role(auth.uid(), id, 'org_admin'));

create policy "Org admins can delete their organisation"
  on public.organisations for delete
  to authenticated
  using (public.has_org_role(auth.uid(), id, 'org_admin'));

-- ========== memberships policies ==========
create policy "Users see their own memberships"
  on public.memberships for select
  to authenticated
  using (user_id = auth.uid());

create policy "Org admins see memberships of their orgs"
  on public.memberships for select
  to authenticated
  using (public.has_org_role(auth.uid(), organisation_id, 'org_admin'));

create policy "Self bootstrap membership on org creation"
  on public.memberships for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Org admins manage memberships"
  on public.memberships for insert
  to authenticated
  with check (public.has_org_role(auth.uid(), organisation_id, 'org_admin'));

create policy "Org admins update memberships"
  on public.memberships for update
  to authenticated
  using (public.has_org_role(auth.uid(), organisation_id, 'org_admin'));

create policy "Org admins delete memberships"
  on public.memberships for delete
  to authenticated
  using (public.has_org_role(auth.uid(), organisation_id, 'org_admin'));

-- ========== workers ==========
create table public.workers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workers_org_idx on public.workers(organisation_id);

alter table public.workers enable row level security;

create policy "Org members can view workers"
  on public.workers for select
  to authenticated
  using (public.is_org_member(auth.uid(), organisation_id));

create policy "Managers can insert workers"
  on public.workers for insert
  to authenticated
  with check (
    public.has_any_org_role(auth.uid(), organisation_id,
      array['org_admin','organiser','activity_manager']::public.app_role[])
  );

create policy "Managers can update workers"
  on public.workers for update
  to authenticated
  using (
    public.has_any_org_role(auth.uid(), organisation_id,
      array['org_admin','organiser','activity_manager']::public.app_role[])
  );

create policy "Managers can delete workers"
  on public.workers for delete
  to authenticated
  using (
    public.has_any_org_role(auth.uid(), organisation_id,
      array['org_admin','organiser','activity_manager']::public.app_role[])
  );

-- ========== updated_at triggers ==========
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

create trigger organisations_set_updated_at
  before update on public.organisations
  for each row execute function public.tg_set_updated_at();

create trigger workers_set_updated_at
  before update on public.workers
  for each row execute function public.tg_set_updated_at();

-- ========== Auto-création de profil à l'inscription ==========
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
