
-- Invitations table
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  email text not null,
  role app_role not null default 'worker',
  invited_by uuid not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (organisation_id, email)
);

create index idx_invitations_email on public.invitations (lower(email));
create index idx_invitations_org on public.invitations (organisation_id);

alter table public.invitations enable row level security;

-- Admin peut tout faire sur les invitations de son orga
create policy "Org admins manage invitations select"
on public.invitations for select to authenticated
using (public.has_org_role(auth.uid(), organisation_id, 'org_admin'::app_role));

create policy "Org admins manage invitations insert"
on public.invitations for insert to authenticated
with check (
  public.has_org_role(auth.uid(), organisation_id, 'org_admin'::app_role)
  and invited_by = auth.uid()
);

create policy "Org admins manage invitations update"
on public.invitations for update to authenticated
using (public.has_org_role(auth.uid(), organisation_id, 'org_admin'::app_role));

create policy "Org admins manage invitations delete"
on public.invitations for delete to authenticated
using (public.has_org_role(auth.uid(), organisation_id, 'org_admin'::app_role));

-- L'invité peut voir ses propres invitations en attente (matching email)
create policy "Invitee can see own invitations"
on public.invitations for select to authenticated
using (
  lower(email) = lower((select email from auth.users where id = auth.uid()))
);

-- L'invité peut accepter (update status -> accepted) sa propre invitation
create policy "Invitee can accept own invitation"
on public.invitations for update to authenticated
using (
  lower(email) = lower((select email from auth.users where id = auth.uid()))
);

-- Trigger updated_at-like : on garde simple, juste created_at + accepted_at

-- Fonction d'auto-acceptation au signup
create or replace function public.accept_invitations_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.memberships (user_id, organisation_id, role)
  select new.id, i.organisation_id, i.role
  from public.invitations i
  where lower(i.email) = lower(new.email)
    and i.status = 'pending'
  on conflict do nothing;

  update public.invitations
  set status = 'accepted', accepted_at = now()
  where lower(email) = lower(new.email)
    and status = 'pending';

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_accept_invites on auth.users;
create trigger on_auth_user_created_accept_invites
after insert on auth.users
for each row execute function public.accept_invitations_on_signup();

-- Fonction acceptation manuelle (utilisateur déjà existant)
create or replace function public.accept_invitation(_invitation_id uuid)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _user_email text;
  _inv public.invitations;
  _m public.memberships;
begin
  if _user_id is null then raise exception 'Not authenticated'; end if;

  select email into _user_email from auth.users where id = _user_id;
  select * into _inv from public.invitations where id = _invitation_id;

  if _inv is null then raise exception 'Invitation not found'; end if;
  if lower(_inv.email) <> lower(_user_email) then raise exception 'Email mismatch'; end if;
  if _inv.status <> 'pending' then raise exception 'Invitation already %', _inv.status; end if;

  insert into public.memberships (user_id, organisation_id, role)
  values (_user_id, _inv.organisation_id, _inv.role)
  on conflict do nothing
  returning * into _m;

  update public.invitations set status = 'accepted', accepted_at = now() where id = _invitation_id;

  if _m is null then
    select * into _m from public.memberships
    where user_id = _user_id and organisation_id = _inv.organisation_id;
  end if;

  return _m;
end;
$$;

-- Vue : memberships d'une orga avec email/nom (pour la page Membres)
-- On crée une fonction SECURITY DEFINER plutôt qu'une vue, plus simple côté RLS
create or replace function public.list_org_members(_org_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  role app_role,
  email text,
  full_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.user_id, m.role, p.email, p.full_name, m.created_at
  from public.memberships m
  left join public.profiles p on p.id = m.user_id
  where m.organisation_id = _org_id
    and public.has_org_role(auth.uid(), _org_id, 'org_admin'::app_role)
  order by m.created_at asc;
$$;

-- Permettre à un admin de changer le rôle d'un membre est déjà couvert par la policy update existante.

-- Affectations d'un travailleur : helper côté SQL pour récupérer + joindre shift/activity/event
create or replace function public.list_worker_assignments(_worker_id uuid)
returns table (
  assignment_id uuid,
  status assignment_status,
  shift_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  role_name text,
  activity_id uuid,
  activity_name text,
  event_id uuid,
  event_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.status, s.id, s.start_at, s.end_at,
         r.name, ac.id, ac.name, ev.id, ev.name
  from public.assignments a
  join public.shifts s on s.id = a.shift_id
  left join public.roles r on r.id = s.role_id
  join public.activities ac on ac.id = s.activity_id
  join public.events ev on ev.id = ac.event_id
  where a.worker_id = _worker_id
    and public.is_org_member(auth.uid(), a.organisation_id)
  order by s.start_at asc;
$$;
