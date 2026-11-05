begin;

alter table public.rooms
  add column exclude_last_requestor boolean not null default false;

-- Room identity and ownership remain immutable through the Data API.
grant update (name, exclude_last_requestor), delete on public.rooms to authenticated;

create policy "Users can update their own room settings"
  on public.rooms for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own rooms"
  on public.rooms for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- Supports finding the most recently watched request in a room.
create index movie_requests_room_watched_at_idx
  on public.movie_requests (room_id, watched_at desc, id desc)
  where watched_at is not null;

commit;
