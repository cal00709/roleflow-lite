create or replace function public.create_organisation_with_owner(_name text, _slug text)
returns public.organisations
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _organisation public.organisations;
begin
  if _user_id is null then
    raise exception 'Not authenticated';
  end if;

  if length(trim(coalesce(_name, ''))) < 2 then
    raise exception 'Organisation name is required';
  end if;

  if length(trim(coalesce(_slug, ''))) < 2 then
    raise exception 'Organisation slug is required';
  end if;

  insert into public.organisations (name, slug)
  values (trim(_name), trim(_slug))
  returning * into _organisation;

  insert into public.memberships (user_id, organisation_id, role)
  values (_user_id, _organisation.id, 'org_admin'::public.app_role);

  return _organisation;
end;
$$;

revoke all on function public.create_organisation_with_owner(text, text) from public;
grant execute on function public.create_organisation_with_owner(text, text) to authenticated;