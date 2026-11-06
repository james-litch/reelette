-- Local development seed. Runs after migrations on a fresh start or db reset.
-- Reuse existing accounts by email so Google sign-in keeps the same ownership.
-- New accounts have confirmed email identities, but no passwords or sessions.
-- Google can link the owner's verified email when signing in after a reset.
begin;

with new_users as (
  insert into auth.users (
    id, instance_id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    encrypted_password, confirmation_token, recovery_token,
    email_change_token_new, email_change
  )
  select
    seed.id, '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated', seed.email, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', seed.name, 'email_verified', true),
    now(), now(), '', '', '', '', ''
  from (values
    ('b32f797b-4133-4f97-87e3-4487de43f041'::uuid, 'james.litchfield99@gmail.com', 'James'),
    ('1712aaca-10d4-4b7b-951a-b1133de4c5b4'::uuid, 'test-member@example.com', 'Test Member')
  ) as seed(id, email, name)
  where not exists (select 1 from auth.users u where lower(u.email) = seed.email)
  returning id, email
)
insert into auth.identities (user_id, provider_id, provider, identity_data, created_at, updated_at)
select id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now()
from new_users;

insert into public.rooms (id, owner_id, name)
select 'bb944753-19ad-4ec4-a33f-8e8490ea40bc'::uuid, id, 'Test'
from auth.users where lower(email) = 'james.litchfield99@gmail.com'
on conflict (id) do update set owner_id = excluded.owner_id, name = excluded.name;

-- Owners are listed through rooms.owner_id, so only the test user needs a row.
-- Rerunning the seed restores this membership after testing its removal.
insert into public.room_members (room_id, user_id)
select 'bb944753-19ad-4ec4-a33f-8e8490ea40bc'::uuid, id
from auth.users where lower(email) = 'test-member@example.com'
on conflict (room_id, user_id) do nothing;

commit;
