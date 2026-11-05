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

  begin
    update public.rooms set name = 'Changed';
    raise exception 'Updates should not be granted';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.rooms;
    raise exception 'Deletes should not be granted';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
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
end $$;

reset role;
rollback;
