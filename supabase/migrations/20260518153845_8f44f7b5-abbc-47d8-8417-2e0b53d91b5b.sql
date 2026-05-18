
-- Fix search_path on updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Restrict SECURITY DEFINER helpers: only callable from RLS (no direct anon/auth API call needed)
revoke execute on function public.has_org_role(uuid, uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.is_org_member(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.has_any_org_role(uuid, uuid, public.app_role[]) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Tighten organisation INSERT policy
drop policy "Any authenticated user can create an organisation" on public.organisations;
create policy "Authenticated users can create organisations"
  on public.organisations for insert
  to authenticated
  with check (auth.uid() is not null);
