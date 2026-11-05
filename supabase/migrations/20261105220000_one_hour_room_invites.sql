begin;

alter table public.room_invites
  alter column expires_at set default (now() + interval '1 hour');

-- Existing links were issued with a seven-day lifetime. Keep their original
-- issue time and shorten that lifetime to one hour, including already-old links.
update public.room_invites
  set expires_at = expires_at - interval '6 days 23 hours';

create or replace function public.create_room_invite(room_id uuid)
returns table (token uuid, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.rooms r where r.id = $1 and r.owner_id = auth.uid() for update;
  if not found then raise exception 'Only the owner can invite people' using errcode = '42501'; end if;
  return query
    insert into public.room_invites as i (room_id) values ($1)
    on conflict on constraint room_invites_pkey do update
      set token = gen_random_uuid(), expires_at = now() + interval '1 hour'
    returning i.token, i.expires_at;
end;
$$;

commit;
