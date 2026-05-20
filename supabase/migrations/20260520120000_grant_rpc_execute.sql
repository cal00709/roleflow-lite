-- P0: allow authenticated clients to call RPCs via PostgREST (Members page, worker assignments, invite accept)
revoke all on function public.accept_invitation(uuid) from public;
grant execute on function public.accept_invitation(uuid) to authenticated;

revoke all on function public.list_org_members(uuid) from public;
grant execute on function public.list_org_members(uuid) to authenticated;

revoke all on function public.list_worker_assignments(uuid) from public;
grant execute on function public.list_worker_assignments(uuid) to authenticated;
