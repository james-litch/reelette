begin;

create table public.movie_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  tmdb_id integer not null check (tmdb_id > 0),
  title text not null check (char_length(btrim(title)) > 0),
  poster_path text,
  genres text[] not null default '{}',
  release_year integer,
  requestor_name text not null,
  created_at timestamptz not null default now(),
  constraint movie_requests_requestor_length check (char_length(requestor_name) between 1 and 80),
  constraint movie_requests_requestor_trimmed check (
    requestor_name = btrim(requestor_name) and char_length(btrim(requestor_name)) > 0
  )
);

create index movie_requests_room_created_at_idx
  on public.movie_requests (room_id, created_at desc, id desc);

alter table public.movie_requests enable row level security;
revoke all on table public.movie_requests from public, anon, authenticated;
grant select, insert on table public.movie_requests to authenticated;

create policy "Room owners can read movie requests"
  on public.movie_requests for select to authenticated
  using (exists (
    select 1 from public.rooms
    where rooms.id = movie_requests.room_id and rooms.owner_id = (select auth.uid())
  ));

create policy "Room owners can add movie requests"
  on public.movie_requests for insert to authenticated
  with check (exists (
    select 1 from public.rooms
    where rooms.id = movie_requests.room_id and rooms.owner_id = (select auth.uid())
  ));

-- Invoker security keeps the same RLS checks as reading requests directly.
create function public.get_room_requestors(room_id uuid)
returns table (name text)
language sql stable security invoker
set search_path = ''
as $$
  select min(requestor_name) as name
  from public.movie_requests
  where movie_requests.room_id = $1
  group by lower(requestor_name)
  order by lower(requestor_name);
$$;

revoke all on function public.get_room_requestors(uuid) from public, anon, authenticated;
grant execute on function public.get_room_requestors(uuid) to authenticated;

commit;
