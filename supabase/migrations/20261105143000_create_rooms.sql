begin;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint rooms_name_length check (char_length(name) between 1 and 80),
  constraint rooms_name_trimmed check (name = btrim(name) and char_length(btrim(name)) > 0)
);

create index rooms_owner_created_at_idx
  on public.rooms (owner_id, created_at desc, id desc);

alter table public.rooms enable row level security;

-- Only the operations this feature needs are exposed through the Data API.
revoke all on table public.rooms from public, anon, authenticated;
grant select, insert on table public.rooms to authenticated;

create policy "Users can read their own rooms"
  on public.rooms for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own rooms"
  on public.rooms for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

commit;
