-- Local/CI only: the administrative connection can provision a test partition
-- when db-only CI has no Realtime service to create today's partition for it.
-- Every fixture, message and any new partition rolls back.
begin;
set local timezone = 'UTC';
set local role supabase_realtime_admin;
do $$
begin
  execute format(
    'create table if not exists realtime.%I partition of realtime.messages for values from (%L) to (%L)',
    'messages_' || to_char(current_date, 'YYYY_MM_DD'), current_date, current_date + 1
  );
end $$;
reset role;

select set_config('test.owner', gen_random_uuid()::text, true);
select set_config('test.member', gen_random_uuid()::text, true);
select set_config('test.outsider', gen_random_uuid()::text, true);
select set_config('test.room', gen_random_uuid()::text, true);
select set_config('test.other_room', gen_random_uuid()::text, true);
select set_config('test.topic', 'room:' || current_setting('test.room') || ':requests', true);

insert into auth.users (id) values
  (current_setting('test.owner')::uuid),
  (current_setting('test.member')::uuid),
  (current_setting('test.outsider')::uuid);
insert into public.rooms (id, owner_id, name) values
  (current_setting('test.room')::uuid, current_setting('test.owner')::uuid, 'Live room'),
  (current_setting('test.other_room')::uuid, current_setting('test.outsider')::uuid, 'Other room');
insert into public.room_members (room_id, user_id)
  values (current_setting('test.room')::uuid, current_setting('test.member')::uuid);

-- These actual mutations must emit three private, room-scoped invalidations.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member'), 'role', 'authenticated')::text, true);
insert into public.movie_requests (room_id, tmdb_id, title, requestor_name)
  values (current_setting('test.room')::uuid, 1, 'Private movie title', 'Private requestor');
update public.movie_requests set watched_at = now() where room_id = current_setting('test.room')::uuid;
delete from public.movie_requests where room_id = current_setting('test.room')::uuid;
reset role;
do $$
begin
  if (select count(*) from realtime.messages where topic = current_setting('test.topic')) <> 3 then
    raise exception 'Insert, watch and delete must each broadcast';
  end if;
  if exists (select 1 from realtime.messages where topic = current_setting('test.topic')
    and (not private or event <> 'requests_changed' or extension <> 'broadcast' or payload - 'id' <> '{}'::jsonb)) then
    raise exception 'Notifications must be private and contain no request or profile data';
  end if;
end $$;

-- Exercise the actual SELECT policy with each user's JWT and channel topic.
set local role authenticated;
select set_config('realtime.topic', current_setting('test.topic'), true);
do $$
begin
  if (select count(*) from realtime.messages where topic = current_setting('test.topic')) <> 3 then
    raise exception 'Joined members should receive room notifications';
  end if;
  begin
    insert into realtime.messages (topic, extension, event, payload, private)
      values (current_setting('test.topic'), 'broadcast', 'requests_changed', '{}'::jsonb, true);
    raise exception 'Members must not spoof database broadcasts';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.owner'), 'role', 'authenticated')::text, true);
do $$
begin
  if (select count(*) from realtime.messages where topic = current_setting('test.topic')) <> 3 then
    raise exception 'Owners should receive room notifications';
  end if;
end $$;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.outsider'), 'role', 'authenticated')::text, true);
do $$
begin
  if exists (select 1 from realtime.messages where topic = current_setting('test.topic')) then
    raise exception 'Outsiders must not receive another room''s notifications';
  end if;
end $$;

-- Removed memberships cannot authorize a new subscription.
reset role;
delete from public.room_members where room_id = current_setting('test.room')::uuid;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member'), 'role', 'authenticated')::text, true);
do $$
begin
  if exists (select 1 from realtime.messages where topic = current_setting('test.topic')) then
    raise exception 'Removed members must not authorize new subscriptions';
  end if;
end $$;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.owner'), 'role', 'authenticated')::text, true);
select set_config('realtime.topic', 'room:invalid:requests', true);
do $$
begin
  if exists (select 1 from realtime.messages) then
    raise exception 'Malformed topics must fail closed without UUID errors';
  end if;
end $$;

set local role anon;
select set_config('request.jwt.claims', '{}', true);
select set_config('realtime.topic', current_setting('test.topic'), true);
do $$
begin
  if exists (select 1 from realtime.messages where topic = current_setting('test.topic')) then
    raise exception 'Anonymous users must not receive room notifications';
  end if;
end $$;
rollback;
