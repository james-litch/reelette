-- Run after the rooms migration. All fixtures and changes are rolled back.
begin;

select set_config('test.room_owner', gen_random_uuid()::text, true);
select set_config('test.other_owner', gen_random_uuid()::text, true);

insert into auth.users (id) values
  (current_setting('test.room_owner')::uuid),
  (current_setting('test.other_owner')::uuid);

insert into public.rooms (owner_id, name) values
  (current_setting('test.other_owner')::uuid, 'Someone else''s room');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object(
  'sub', current_setting('test.room_owner'), 'role', 'authenticated'
)::text, true);

insert into public.rooms (owner_id, name)
values (current_setting('test.room_owner')::uuid, 'Friday Movie Night');

do $$
declare
  affected integer;
  owned_room uuid;
begin
  if (select count(*) from public.rooms) <> 1 then
    raise exception 'Expected to see exactly one owned room';
  end if;

  if exists (select 1 from public.rooms where owner_id <> auth.uid()) then
    raise exception 'Another user''s room was visible';
  end if;

  begin
    insert into public.rooms (owner_id, name)
    values (current_setting('test.other_owner')::uuid, 'Forged owner');
    raise exception 'Inserting a room for another user should fail';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.rooms (owner_id, name) values (auth.uid(), '');
    raise exception 'Empty room names should fail';
  exception when check_violation then null;
  end;

  begin
    insert into public.rooms (owner_id, name) values (auth.uid(), '   ');
    raise exception 'Blank room names should fail';
  exception when check_violation then null;
  end;

  begin
    insert into public.rooms (owner_id, name) values (auth.uid(), repeat('a', 81));
    raise exception 'Overlong room names should fail';
  exception when check_violation then null;
  end;

  select id into owned_room from public.rooms;
  if (select exclude_last_requestor from public.rooms where id = owned_room) then
    raise exception 'Exclusion should default to off';
  end if;

  update public.rooms set name = 'Saturday Movie Night', exclude_last_requestor = true
    where id = owned_room;
  if not exists (select 1 from public.rooms where id = owned_room
    and name = 'Saturday Movie Night' and exclude_last_requestor) then
    raise exception 'Owners should be able to save their settings';
  end if;

  update public.rooms set name = 'Forged change'
    where owner_id = current_setting('test.other_owner')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Another owner''s room was updated'; end if;

  begin
    update public.rooms set owner_id = current_setting('test.other_owner')::uuid;
    raise exception 'Ownership must remain immutable';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.rooms set name = '   ' where id = owned_room;
    raise exception 'Updated names must still pass constraints';
  exception when check_violation then null;
  end;

  delete from public.rooms where owner_id = current_setting('test.other_owner')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Another owner''s room was deleted'; end if;

  insert into public.movie_requests (room_id, tmdb_id, title, requestor_name, watched_at)
    values (owned_room, 1, 'Unwatched fixture', 'Jamie', null),
           (owned_room, 2, 'Watched fixture', 'Alex', now());
  delete from public.rooms where id = owned_room;
  if exists (select 1 from public.rooms where id = owned_room) then
    raise exception 'Owners should be able to delete their room';
  end if;
  -- RLS hides orphaned requests, so verify the cascade as postgres below too.
  perform set_config('test.deleted_room', owned_room::text, true);
end $$;

reset role;
do $$
begin
  if exists (select 1 from public.movie_requests where room_id = current_setting('test.deleted_room')::uuid) then
    raise exception 'Deleting a room should cascade to requests and history';
  end if;
  if not exists (select 1 from public.rooms where owner_id = current_setting('test.other_owner')::uuid
    and name = 'Someone else''s room') then
    raise exception 'Another owner''s room should be unchanged';
  end if;
end $$;

set local role anon;
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  begin
    perform 1 from public.rooms;
    raise exception 'Anonymous reads should fail';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.rooms (owner_id, name)
    values (current_setting('test.room_owner')::uuid, 'Anonymous room');
    raise exception 'Anonymous inserts should fail';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.rooms set name = 'Anonymous change';
    raise exception 'Anonymous updates should fail';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.rooms;
    raise exception 'Anonymous deletes should fail';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;
