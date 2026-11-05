begin;

create function public.remove_room_member(room_id uuid, member_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  -- Check ownership inside the database, including for direct RPC calls.
  perform 1 from public.rooms r
    where r.id = $1 and r.owner_id = auth.uid() for update;
  if not found then
    raise exception 'Only the owner can remove members' using errcode = '42501';
  end if;
  if $2 is null or $2 = auth.uid() then
    raise exception 'The owner cannot be removed' using errcode = '22023';
  end if;

  -- Idempotent: another owner action may already have removed this membership.
  delete from public.room_members m where m.room_id = $1 and m.user_id = $2;
  return true;
end;
$$;

revoke all on function public.remove_room_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.remove_room_member(uuid, uuid) to authenticated;

commit;
