-- All fixtures and changes are rolled back.
begin;

select set_config('test.owner', gen_random_uuid()::text, true);
select set_config('test.other_owner', gen_random_uuid()::text, true);
select set_config('test.room', gen_random_uuid()::text, true);
select set_config('test.second_room', gen_random_uuid()::text, true);
select set_config('test.other_room', gen_random_uuid()::text, true);

insert into auth.users (id) values
  (current_setting('test.owner')::uuid),
  (current_setting('test.other_owner')::uuid);
insert into public.rooms (id, owner_id, name) values
  (current_setting('test.room')::uuid, current_setting('test.owner')::uuid, 'Friday'),
  (current_setting('test.second_room')::uuid, current_setting('test.owner')::uuid, 'Saturday'),
  (current_setting('test.other_room')::uuid, current_setting('test.other_owner')::uuid, 'Private');
insert into public.movie_requests (room_id, tmdb_id, title, requestor_name) values
  (current_setting('test.other_room')::uuid, 1, 'Private movie', 'Secret requestor');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object(
  'sub', current_setting('test.owner'), 'role', 'authenticated'
)::text, true);

insert into public.movie_requests (room_id, tmdb_id, title, requestor_name) values
  (current_setting('test.room')::uuid, 157336, 'Interstellar', 'Jamie'),
  (current_setting('test.room')::uuid, 2, 'Another movie', 'jamie'),
  (current_setting('test.second_room')::uuid, 3, 'Saturday movie', 'Alex');

do $$
begin
  if (select count(*) from public.movie_requests) <> 3 then
    raise exception 'Expected only requests from owned rooms';
  end if;
  if (select count(*) from public.get_room_requestors(current_setting('test.room')::uuid)) <> 1 then
    raise exception 'Names must be deduplicated ignoring case and scoped to one room';
  end if;
  if exists (select 1 from public.get_room_requestors(current_setting('test.other_room')::uuid)) then
    raise exception 'Names in another owner''s room must not be visible';
  end if;
  begin
    insert into public.movie_requests (room_id, tmdb_id, title, requestor_name)
    values (current_setting('test.other_room')::uuid, 4, 'Forged request', 'Jamie');
    raise exception 'Inserting into another owner''s room should fail';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.movie_requests (room_id, tmdb_id, title, requestor_name)
    values (current_setting('test.room')::uuid, 4, 'Movie', '   ');
    raise exception 'Blank names should fail';
  exception when check_violation then null;
  end;
  begin
    insert into public.movie_requests (room_id, tmdb_id, title, requestor_name)
    values (current_setting('test.room')::uuid, 4, 'Movie', ' Jamie ');
    raise exception 'Untrimmed names should fail';
  exception when check_violation then null;
  end;
  begin
    insert into public.movie_requests (room_id, tmdb_id, title, requestor_name)
    values (current_setting('test.room')::uuid, 4, 'Movie', repeat('a', 81));
    raise exception 'Long names should fail';
  exception when check_violation then null;
  end;
  begin
    update public.movie_requests set requestor_name = 'Changed';
    raise exception 'Updates should not be granted';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.movie_requests set room_id = current_setting('test.second_room')::uuid;
    raise exception 'Moving requests between rooms must not be granted';
  exception when insufficient_privilege then null;
  end;

  update public.movie_requests set watched_at = now()
    where room_id = current_setting('test.other_room')::uuid;
  if found then raise exception 'Must not mark another owner''s movie watched'; end if;
  delete from public.movie_requests where room_id = current_setting('test.other_room')::uuid;
  if found then raise exception 'Must not delete another owner''s movie'; end if;

  update public.movie_requests set watched_at = now()
    where room_id = current_setting('test.room')::uuid and tmdb_id = 157336;
  if not found then raise exception 'Owner must be able to mark a movie watched'; end if;
  if (select count(*) from public.movie_requests where watched_at is not null) <> 1 then
    raise exception 'Expected one watched request';
  end if;
  delete from public.movie_requests where room_id = current_setting('test.room')::uuid and tmdb_id = 2;
  if not found then raise exception 'Owner must be able to delete a request'; end if;
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{}', true);
do $$
begin
  begin
    perform 1 from public.movie_requests;
    raise exception 'Anonymous reads should fail';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.movie_requests (room_id, tmdb_id, title, requestor_name)
    values (current_setting('test.room')::uuid, 1, 'Movie', 'Anonymous');
    raise exception 'Anonymous inserts should fail';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.get_room_requestors(current_setting('test.room')::uuid);
    raise exception 'Anonymous name lookups should fail';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.movie_requests set watched_at = now();
    raise exception 'Anonymous updates should fail';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.movie_requests;
    raise exception 'Anonymous deletes should fail';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;
