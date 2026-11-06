-- All fixtures and mutations roll back; no existing user data is changed.
begin;
select set_config('test.owner', gen_random_uuid()::text, true);
select set_config('test.member', gen_random_uuid()::text, true);
select set_config('test.outsider', gen_random_uuid()::text, true);
select set_config('test.room', gen_random_uuid()::text, true);
select set_config('test.private_room', gen_random_uuid()::text, true);
insert into auth.users (id, raw_user_meta_data) values
  (current_setting('test.owner')::uuid, '{"full_name":"Room Owner"}'),
  (current_setting('test.member')::uuid, '{"full_name":"Invited Member"}'),
  (current_setting('test.outsider')::uuid, '{"name":"Another Member"}');
insert into public.rooms (id, owner_id, name) values
  (current_setting('test.room')::uuid, current_setting('test.owner')::uuid, 'Shared'),
  (current_setting('test.private_room')::uuid, current_setting('test.owner')::uuid, 'Private');
insert into public.movie_requests (room_id, tmdb_id, title, requestor_name) values
  (current_setting('test.room')::uuid, 1, 'Owner movie', 'Owner'),
  (current_setting('test.private_room')::uuid, 2, 'Private movie', 'Secret');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.owner'), 'role', 'authenticated')::text, true);
select set_config('test.token', token::text, true), set_config('test.expiry', expires_at::text, true)
  from public.create_room_invite(current_setting('test.room')::uuid);
do $$
begin
  if current_setting('test.expiry')::timestamptz <> now() + interval '1 hour' then
    raise exception 'New invite links should expire exactly one hour after creation';
  end if;
  if (select count(*) from public.get_room_members(current_setting('test.room')::uuid)) <> 1 then
    raise exception 'The owner should appear without a membership row';
  end if;
  if not exists (select 1 from public.get_room_members(current_setting('test.room')::uuid) where name = 'Room Owner' and is_owner) then
    raise exception 'Member profiles and owner role should be returned';
  end if;
end $$;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member'), 'role', 'authenticated')::text, true);
do $$
begin
  if exists (select 1 from public.rooms) or exists (select 1 from public.movie_requests) then
    raise exception 'A link alone must not grant access before joining';
  end if;
  if not exists (select 1 from public.get_room_invite(current_setting('test.token')::uuid) where room_name = 'Shared') then
    raise exception 'An authenticated recipient should be able to preview the invitation';
  end if;
  begin
    perform * from public.get_room_members(current_setting('test.room')::uuid);
    raise exception 'Non-members must not see room users';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.room_members (room_id, user_id) values (current_setting('test.room')::uuid, auth.uid());
    raise exception 'Users must not self-enrol without an invite';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.accept_room_invite(gen_random_uuid());
    raise exception 'Unknown tokens must fail';
  exception when invalid_parameter_value then null;
  end;
end $$;

select public.accept_room_invite(current_setting('test.token')::uuid);
select public.accept_room_invite(current_setting('test.token')::uuid);
do $$
begin
  if (select count(*) from public.rooms) <> 1 or (select count(*) from public.movie_requests) <> 1 then
    raise exception 'Members should only see joined rooms and their movies';
  end if;
  if (select count(*) from public.get_room_members(current_setting('test.room')::uuid)) <> 2 then
    raise exception 'Joining twice must not duplicate a member';
  end if;
  if not exists (select 1 from public.get_room_members(current_setting('test.room')::uuid)
    where user_id = auth.uid() and name = 'Invited Member' and not is_owner) then
    raise exception 'Joined users should be listed as members';
  end if;
  update public.rooms set name = 'Renamed by member', exclude_last_requestor = true
    where id = current_setting('test.room')::uuid;
  if not found then raise exception 'Members should update general settings'; end if;
  update public.rooms set name = 'Forbidden' where id = current_setting('test.private_room')::uuid;
  if found then raise exception 'Non-members must not change another room'; end if;
  update public.movie_requests set watched_at = now() where room_id = current_setting('test.room')::uuid;
  if not found then raise exception 'Members should mark owner requests watched'; end if;
  if not exists (select 1 from public.movie_requests where watched_at is not null) then
    raise exception 'Members should see history for random-selection exclusion';
  end if;
  if not exists (select 1 from public.get_room_requestors(current_setting('test.room')::uuid) where name = 'Owner') then
    raise exception 'Members should see previous requestors';
  end if;
  delete from public.movie_requests where room_id = current_setting('test.room')::uuid;
  if not found then raise exception 'Members should delete other people''s movie requests'; end if;
  insert into public.movie_requests (room_id, tmdb_id, title, requestor_name)
    values (current_setting('test.room')::uuid, 3, 'Member movie', 'Member');
  begin
    insert into public.movie_requests (room_id, tmdb_id, title, requestor_name)
      values (current_setting('test.private_room')::uuid, 4, 'Forbidden', 'Member');
    raise exception 'Members must not add to unjoined rooms';
  exception when insufficient_privilege then null;
  end;
  delete from public.rooms where id = current_setting('test.room')::uuid;
  if found then raise exception 'Members must not delete rooms'; end if;
  begin
    update public.rooms set owner_id = auth.uid() where id = current_setting('test.room')::uuid;
    raise exception 'Members must not take ownership';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.create_room_invite(current_setting('test.room')::uuid);
    raise exception 'Only owners can rotate invite links';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.room_invites;
    raise exception 'Members must not read bearer tokens directly';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.room_members;
    raise exception 'Members must not remove or alter memberships';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.remove_room_member(current_setting('test.room')::uuid, current_setting('test.owner')::uuid);
    raise exception 'Members must not remove the owner via RPC';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.remove_room_member(current_setting('test.room')::uuid, auth.uid());
    raise exception 'Members must not call owner-only removal even for themselves';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.remove_room_member(current_setting('test.private_room')::uuid, current_setting('test.outsider')::uuid);
    raise exception 'Outsiders must not remove members from other rooms';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Owners can rotate; the old bearer link stops working, without removing members.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.owner'), 'role', 'authenticated')::text, true);
select set_config('test.new_token', token::text, true), set_config('test.expiry', expires_at::text, true)
  from public.create_room_invite(current_setting('test.room')::uuid);
do $$
begin
  if current_setting('test.expiry')::timestamptz <> now() + interval '1 hour' then
    raise exception 'Replacement invite links should expire exactly one hour after creation';
  end if;
end $$;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.outsider'), 'role', 'authenticated')::text, true);
do $$
begin
  if exists (select 1 from public.rooms) then raise exception 'Outsiders must not see rooms'; end if;
  begin
    perform public.accept_room_invite(current_setting('test.token')::uuid);
    raise exception 'Replaced tokens must fail';
  exception when invalid_parameter_value then null;
  end;
  if exists (select 1 from public.get_room_invite(current_setting('test.token')::uuid)) then
    raise exception 'Replaced tokens must not preview rooms';
  end if;
end $$;
select public.accept_room_invite(current_setting('test.new_token')::uuid);
-- A link supports more than one recipient.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member'), 'role', 'authenticated')::text, true);
select public.accept_room_invite(current_setting('test.new_token')::uuid);
do $$
begin
  if (select count(*) from public.get_room_members(current_setting('test.room')::uuid)) <> 3 then
    raise exception 'A link should support multiple people';
  end if;
end $$;

reset role;
update public.room_invites set expires_at = now() where room_id = current_setting('test.room')::uuid;
set local role authenticated;
do $$
begin
  if exists (select 1 from public.get_room_invite(current_setting('test.new_token')::uuid)) then
    raise exception 'Expired invites should not preview rooms';
  end if;
  begin
    perform public.accept_room_invite(current_setting('test.new_token')::uuid);
    raise exception 'Expired tokens must fail';
  exception when invalid_parameter_value then null;
  end;
  if not exists (select 1 from public.rooms where id = current_setting('test.room')::uuid) then
    raise exception 'Expiry must not remove existing members';
  end if;
end $$;

-- Removing a membership revokes access and preserves requests and other rooms.
reset role;
insert into public.room_members (room_id, user_id)
  values (current_setting('test.private_room')::uuid, current_setting('test.member')::uuid);
update public.movie_requests set watched_at = now() where room_id = current_setting('test.room')::uuid;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.owner'), 'role', 'authenticated')::text, true);
do $$
begin
  begin
    perform public.remove_room_member(current_setting('test.room')::uuid, auth.uid());
    raise exception 'Owners must not remove themselves';
  exception when invalid_parameter_value then null; end;
  perform public.remove_room_member(current_setting('test.room')::uuid, current_setting('test.member')::uuid);
  perform public.remove_room_member(current_setting('test.room')::uuid, current_setting('test.member')::uuid);
  if exists (select 1 from public.get_room_members(current_setting('test.room')::uuid)
    where user_id = current_setting('test.member')::uuid) then
    raise exception 'Removed members must disappear from the member list';
  end if;
  if not exists (select 1 from public.movie_requests where room_id = current_setting('test.room')::uuid and watched_at is not null) then
    raise exception 'Removing a member must preserve their requests and history';
  end if;
end $$;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member'), 'role', 'authenticated')::text, true);
do $$
begin
  if exists (select 1 from public.rooms where id = current_setting('test.room')::uuid)
    or exists (select 1 from public.movie_requests where room_id = current_setting('test.room')::uuid) then
    raise exception 'Removed members must lose room and movie access immediately';
  end if;
  if not exists (select 1 from public.rooms where id = current_setting('test.private_room')::uuid) then
    raise exception 'Removal must leave other room memberships intact';
  end if;
  update public.rooms set name = 'Forbidden' where id = current_setting('test.room')::uuid;
  if found then raise exception 'Removed members must not rename rooms'; end if;
  update public.movie_requests set watched_at = now() where room_id = current_setting('test.room')::uuid;
  if found then raise exception 'Removed members must not mark movies watched'; end if;
  delete from public.movie_requests where room_id = current_setting('test.room')::uuid;
  if found then raise exception 'Removed members must not delete movies'; end if;
  begin
    insert into public.movie_requests (room_id, tmdb_id, title, requestor_name)
      values (current_setting('test.room')::uuid, 99, 'Forbidden', 'Removed member');
    raise exception 'Removed members must not add movies';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.get_room_members(current_setting('test.room')::uuid);
    raise exception 'Removed members must not list room users';
  exception when insufficient_privilege then null; end;
end $$;

set local role anon;
select set_config('request.jwt.claims', '{}', true);
do $$
begin
  begin perform public.accept_room_invite(current_setting('test.new_token')::uuid);
    raise exception 'Anonymous users must not accept invites';
  exception when insufficient_privilege then null; end;
  begin perform * from public.get_room_invite(current_setting('test.new_token')::uuid);
    raise exception 'Anonymous users must not preview rooms';
  exception when insufficient_privilege then null; end;
  begin perform * from public.get_room_members(current_setting('test.room')::uuid);
    raise exception 'Anonymous users must not list members';
  exception when insufficient_privilege then null; end;
  begin perform * from public.create_room_invite(current_setting('test.room')::uuid);
    raise exception 'Anonymous users must not create invites';
  exception when insufficient_privilege then null; end;
  begin perform public.remove_room_member(current_setting('test.room')::uuid, current_setting('test.member')::uuid);
    raise exception 'Anonymous users must not remove members';
  exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.owner'), 'role', 'authenticated')::text, true);
delete from public.rooms where id = current_setting('test.room')::uuid;
reset role;
do $$
begin
  if exists (select 1 from public.rooms where id = current_setting('test.room')::uuid)
    or exists (select 1 from public.room_members where room_id = current_setting('test.room')::uuid)
    or exists (select 1 from public.room_invites where room_id = current_setting('test.room')::uuid)
    or exists (select 1 from public.movie_requests where room_id = current_setting('test.room')::uuid) then
    raise exception 'Owner deletion should cascade through requests, members, and invites';
  end if;
end $$;
rollback;
