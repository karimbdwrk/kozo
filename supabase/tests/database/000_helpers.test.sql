-- Test helpers (test database only, never in migrations).
-- This file runs first (alphabetical order) and is committed on purpose so the
-- other test files can use the `tests` schema. Each other file runs in its own
-- transaction and rolls back.

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

-- Creates an auth user <key>@test.local (the signup trigger creates the profile).
create or replace function tests.create_user(p_key text, p_confirmed boolean default true)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_key || '@test.local', '', case when p_confirmed then now() end,
    '{}'::jsonb, jsonb_build_object('first_name', p_key, 'last_name', 'Test'), now(), now()
  );
  return v_id;
end;
$$;

create or replace function tests.uid(p_key text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u where u.email = p_key || '@test.local';
$$;

create or replace function tests.org_id(p_slug text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select o.id from public.organizations o where o.slug = p_slug;
$$;

create or replace function tests.role_id(p_slug text, p_key text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.id
    from public.roles r
   where r.organization_id = tests.org_id(p_slug)
     and (r.system_key = p_key or r.name = p_key);
$$;

create or replace function tests.authenticate_as(p_key text, p_aal text default 'aal1')
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', tests.uid(p_key), 'role', 'authenticated', 'aal', p_aal)::text,
    true
  );
end;
$$;

create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
end;
$$;

create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- Two centres A and B, each with its own billing account, all modules on.
--   owner_a / owner_b : owners (role "direction")
--   staff_a   : admin_staff in A
--   learner_a : learner in A
--   susp_a    : admin_staff in A, suspended
--   multi     : learner in A AND admin_staff in B
--   tutor_a   : company tutor in A (Entreprise A)
--   role_mgr  : custom role in A with roles:read/update + team:read only
--   nobody    : no membership
create or replace function tests.seed_two_centres()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a uuid;
  v_b uuid;
  v_role_mgr uuid;
begin
  perform tests.create_user(k)
     from unnest(array[
       'owner_a', 'owner_b', 'staff_a', 'learner_a', 'susp_a', 'multi', 'tutor_a', 'role_mgr', 'nobody'
     ]) as k;

  v_a := public.create_organization(tests.uid('owner_a'), 'Centre A', 'centre-a');
  v_b := public.create_organization(tests.uid('owner_b'), 'Centre B', 'centre-b');

  update public.billing_accounts set enabled_modules = enum_range(null::public.app_module);

  insert into public.companies (organization_id, name)
  values (v_a, 'Entreprise A'), (v_b, 'Entreprise B');

  insert into public.funders (organization_id, name)
  values (v_a, 'Financeur A'), (v_b, 'Financeur B');

  insert into public.roles (organization_id, name, kind)
  values (v_a, 'gestion_roles', 'staff'), (v_b, 'custom_b', 'staff');

  v_role_mgr := tests.role_id('centre-a', 'gestion_roles');

  insert into public.role_permissions (organization_id, role_id, resource, action)
  values
    (v_a, v_role_mgr, 'roles', 'read'),
    (v_a, v_role_mgr, 'roles', 'update'),
    (v_a, v_role_mgr, 'team', 'read'),
    (v_b, tests.role_id('centre-b', 'custom_b'), 'planning', 'read');

  insert into public.memberships (organization_id, user_id, role_id, status, company_id)
  values
    (v_a, tests.uid('staff_a'), tests.role_id('centre-a', 'admin_staff'), 'active', null),
    (v_a, tests.uid('learner_a'), tests.role_id('centre-a', 'apprenant'), 'active', null),
    (v_a, tests.uid('susp_a'), tests.role_id('centre-a', 'admin_staff'), 'suspended', null),
    (v_a, tests.uid('multi'), tests.role_id('centre-a', 'apprenant'), 'active', null),
    (v_b, tests.uid('multi'), tests.role_id('centre-b', 'admin_staff'), 'active', null),
    (v_a, tests.uid('role_mgr'), v_role_mgr, 'active', null),
    (
      v_a, tests.uid('tutor_a'), tests.role_id('centre-a', 'entreprise_tuteur'), 'active',
      (select c.id from public.companies c where c.organization_id = v_a)
    );
end;
$$;

select plan(1);
select has_function('tests', 'seed_two_centres', 'test helpers are installed');
select * from finish();
