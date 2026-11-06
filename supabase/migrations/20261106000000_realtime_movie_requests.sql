begin;

-- Room RLS already checks both ownership and membership. Compare the topic as
-- text so malformed or unrelated topics cannot cause UUID cast errors.
create policy "Room participants can receive request notifications"
  on realtime.messages for select to authenticated
  using (
    extension = 'broadcast'
    and exists (
      select 1 from public.rooms r
      where (select realtime.topic()) = 'room:' || r.id::text || ':requests'
    )
  );

create function private.notify_movie_requests_changed()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- Only an invalidation signal: no movie details, names, or user IDs are sent.
  perform realtime.send(
    '{}'::jsonb,
    'requests_changed',
    'room:' || coalesce(new.room_id, old.room_id)::text || ':requests',
    true
  );
  return null;
end;
$$;
revoke all on function private.notify_movie_requests_changed() from public, anon, authenticated;

create trigger notify_movie_requests_changed
  after insert or update or delete on public.movie_requests
  for each row execute function private.notify_movie_requests_changed();

commit;
