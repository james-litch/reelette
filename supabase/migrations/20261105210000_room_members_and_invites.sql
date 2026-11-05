begin;

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index room_members_user_idx on public.room_members (user_id, room_id);

create table public.room_invites (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

alter table public.room_members enable row level security;
alter table public.room_invites enable row level security;
-- Memberships and bearer tokens are managed only by the checked functions below.
revoke all on public.room_members, public.room_invites from public, anon, authenticated;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Bypasses membership RLS without recursively reading rooms or trusting a caller's user ID.
create function private.is_room_member(room_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.room_members m
    where m.room_id = $1 and m.user_id = (select auth.uid()));
$$;
revoke all on function private.is_room_member(uuid) from public, anon, authenticated;
grant execute on function private.is_room_member(uuid) to authenticated;

drop policy "Users can read their own rooms" on public.rooms;
drop policy "Users can update their own room settings" on public.rooms;
create policy "Owners and members can read rooms" on public.rooms for select to authenticated
  using (owner_id = (select auth.uid()) or private.is_room_member(id));
create policy "Owners and members can update room settings" on public.rooms for update to authenticated
  using (owner_id = (select auth.uid()) or private.is_room_member(id))
  with check (owner_id = (select auth.uid()) or private.is_room_member(id));
-- Existing column grants keep ownership immutable; the delete policy remains owner-only.

drop policy "Room owners can read movie requests" on public.movie_requests;
drop policy "Room owners can add movie requests" on public.movie_requests;
drop policy "Room owners can mark movie requests as watched" on public.movie_requests;
drop policy "Room owners can delete movie requests" on public.movie_requests;
-- The room subqueries use room RLS, granting the same operations to owners and members.
create policy "Room participants can read movie requests" on public.movie_requests for select to authenticated
  using (exists (select 1 from public.rooms where rooms.id = movie_requests.room_id));
create policy "Room participants can add movie requests" on public.movie_requests for insert to authenticated
  with check (exists (select 1 from public.rooms where rooms.id = movie_requests.room_id));
create policy "Room participants can mark movie requests as watched" on public.movie_requests for update to authenticated
  using (exists (select 1 from public.rooms where rooms.id = movie_requests.room_id))
  with check (exists (select 1 from public.rooms where rooms.id = movie_requests.room_id));
create policy "Room participants can delete movie requests" on public.movie_requests for delete to authenticated
  using (exists (select 1 from public.rooms where rooms.id = movie_requests.room_id));

create function public.create_room_invite(room_id uuid)
returns table (token uuid, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  -- Serialize link rotation with deletion and verify ownership inside the database.
  perform 1 from public.rooms r where r.id = $1 and r.owner_id = auth.uid() for update;
  if not found then raise exception 'Only the owner can invite people' using errcode = '42501'; end if;
  return query
    insert into public.room_invites as i (room_id) values ($1)
    on conflict on constraint room_invites_pkey do update
      set token = gen_random_uuid(), expires_at = now() + interval '7 days'
    returning i.token, i.expires_at;
end;
$$;

create function public.get_room_invite(invite_token uuid)
returns table (room_name text)
language sql stable security definer set search_path = ''
as $$
  select r.name from public.room_invites i join public.rooms r on r.id = i.room_id
  where i.token = $1 and i.expires_at > now() and (select auth.uid()) is not null;
$$;

create function public.accept_room_invite(invite_token uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  target_room uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Sign in to join' using errcode = '42501'; end if;
  -- Lock against rotation: validation and membership creation happen atomically.
  select i.room_id into target_room from public.room_invites i
    where i.token = $1 and i.expires_at > now() for update;
  if not found then raise exception 'This invite is unavailable' using errcode = '22023'; end if;
  if not exists (select 1 from public.rooms r where r.id = target_room and r.owner_id = current_user_id) then
    insert into public.room_members (room_id, user_id) values (target_room, current_user_id)
    on conflict do nothing;
  end if;
  return target_room;
end;
$$;

create function public.get_room_members(room_id uuid)
returns table (user_id uuid, name text, is_owner boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.rooms r where r.id = $1
    and (r.owner_id = auth.uid() or private.is_room_member(r.id))) then
    raise exception 'This room is unavailable' using errcode = '42501';
  end if;
  return query
    select u.id,
      coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
        nullif(split_part(u.email, '@', 1), ''), 'Member'),
      p.is_owner
    from (
      select r.owner_id as id, true as is_owner from public.rooms r where r.id = $1
      union all
      select m.user_id, false from public.room_members m join public.rooms r on r.id = m.room_id
        where m.room_id = $1 and m.user_id <> r.owner_id
    ) p join auth.users u on u.id = p.id
    order by p.is_owner desc, lower(coalesce(u.raw_user_meta_data ->> 'full_name', u.email, '')), u.id;
end;
$$;

revoke all on function public.create_room_invite(uuid), public.get_room_invite(uuid),
  public.accept_room_invite(uuid), public.get_room_members(uuid) from public, anon, authenticated;
grant execute on function public.create_room_invite(uuid), public.get_room_invite(uuid),
  public.accept_room_invite(uuid), public.get_room_members(uuid) to authenticated;

commit;
