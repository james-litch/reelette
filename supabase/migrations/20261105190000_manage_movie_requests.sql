begin;

alter table public.movie_requests add column watched_at timestamptz;

-- Only the watched timestamp may change; movie details and room stay fixed.
grant update (watched_at), delete on public.movie_requests to authenticated;

create policy "Room owners can mark movie requests as watched"
  on public.movie_requests for update to authenticated
  using (exists (
    select 1 from public.rooms
    where rooms.id = movie_requests.room_id and rooms.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.rooms
    where rooms.id = movie_requests.room_id and rooms.owner_id = (select auth.uid())
  ));

create policy "Room owners can delete movie requests"
  on public.movie_requests for delete to authenticated
  using (exists (
    select 1 from public.rooms
    where rooms.id = movie_requests.room_id and rooms.owner_id = (select auth.uid())
  ));

commit;
