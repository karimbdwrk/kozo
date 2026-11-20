-- Tenant isolation: a user of centre A can neither read nor write anything of centre B.
-- Tested as owner_a (every permission in A) — the strongest user of A.
-- Note: RLS never raises on UPDATE/DELETE of invisible rows, it affects 0 rows.
-- So writes are verified by re-reading B's data as postgres afterwards.
begin;
select plan(37);

select tests.seed_two_centres();

-- ---------------------------------------------------------------------------
-- READ: nothing of B is visible
-- ---------------------------------------------------------------------------
select tests.authenticate_as('owner_a');

select is((select count(*) from public.organizations where id = tests.org_id('centre-b')), 0::bigint,
  'A cannot read organization B');
select is((select count(*) from public.organization_settings where organization_id = tests.org_id('centre-b')), 0::bigint,
  'A cannot read settings of B');
select is((select count(*) from public.roles where organization_id = tests.org_id('centre-b')), 0::bigint,
  'A cannot read roles of B');
select is((select count(*) from public.role_permissions where organization_id = tests.org_id('centre-b')), 0::bigint,
  'A cannot read role permissions of B');
select is((select count(*) from public.memberships where organization_id = tests.org_id('centre-b')), 0::bigint,
  'A cannot read memberships of B');
select is((select count(*) from public.companies where organization_id = tests.org_id('centre-b')), 0::bigint,
  'A cannot read companies of B');
select is((select count(*) from public.funders where organization_id = tests.org_id('centre-b')), 0::bigint,
  'A cannot read funders of B');
select is((select count(*) from public.billing_accounts where owner_id = tests.uid('owner_b')), 0::bigint,
  'A cannot read the billing account of B');
select is((select count(*) from public.profiles where id = tests.uid('owner_b')), 0::bigint,
  'A cannot read profiles of B members');

-- Sanity: A does see its own data (otherwise the tests above prove nothing).
select is((select count(*) from public.organizations where id = tests.org_id('centre-a')), 1::bigint,
  'A reads its own organization');
select is((select count(*) from public.companies where organization_id = tests.org_id('centre-a')), 1::bigint,
  'A reads its own companies');

-- ---------------------------------------------------------------------------
-- INSERT into B: rejected
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.companies (organization_id, name) values (tests.org_id('centre-b'), 'x') $$,
  '42501', null, 'A cannot insert a company into B');
select throws_ok(
  $$ insert into public.funders (organization_id, name) values (tests.org_id('centre-b'), 'x') $$,
  '42501', null, 'A cannot insert a funder into B');
select throws_ok(
  $$ insert into public.roles (organization_id, name, kind) values (tests.org_id('centre-b'), 'x', 'staff') $$,
  '42501', null, 'A cannot insert a role into B');
select throws_ok(
  $$ insert into public.role_permissions (organization_id, role_id, resource, action)
     values (tests.org_id('centre-b'), tests.role_id('centre-b', 'custom_b'), 'billing', 'read') $$,
  '42501', null, 'A cannot insert a permission into B');
select throws_ok(
  $$ insert into public.memberships (organization_id, user_id, role_id, status)
     values (tests.org_id('centre-b'), tests.uid('owner_a'), tests.role_id('centre-b', 'direction'), 'active') $$,
  '42501', null, 'A cannot make itself a member of B');
select throws_ok(
  $$ insert into public.organizations (billing_account_id, name, slug)
     values ((select id from public.billing_accounts limit 1), 'x', 'centre-x') $$,
  '42501', null, 'clients cannot insert organizations');
select throws_ok(
  $$ insert into public.organization_settings (organization_id) values (tests.org_id('centre-b')) $$,
  '42501', null, 'clients cannot insert organization settings');

-- ---------------------------------------------------------------------------
-- UPDATE / DELETE on B: silently 0 rows
-- ---------------------------------------------------------------------------
update public.organizations set name = 'hacked' where id = tests.org_id('centre-b');
update public.organization_settings set timezone = 'UTC' where organization_id = tests.org_id('centre-b');
update public.companies set name = 'hacked' where organization_id = tests.org_id('centre-b');
update public.funders set name = 'hacked' where organization_id = tests.org_id('centre-b');
update public.roles set name = 'hacked' where organization_id = tests.org_id('centre-b');
update public.memberships set status = 'suspended' where organization_id = tests.org_id('centre-b');
update public.profiles set first_name = 'hacked' where id = tests.uid('owner_b');
delete from public.companies where organization_id = tests.org_id('centre-b');
delete from public.funders where organization_id = tests.org_id('centre-b');
delete from public.role_permissions where organization_id = tests.org_id('centre-b');
delete from public.roles where organization_id = tests.org_id('centre-b') and system_key is null;
delete from public.memberships where organization_id = tests.org_id('centre-b');

-- Moving a row from A to B is impossible (organization_id is not updatable).
select throws_ok(
  $$ update public.companies set organization_id = tests.org_id('centre-b')
     where organization_id = tests.org_id('centre-a') $$,
  '42501', null, 'A cannot move a company to B');
select throws_ok(
  $$ update public.memberships set organization_id = tests.org_id('centre-b')
     where organization_id = tests.org_id('centre-a') $$,
  '42501', null, 'A cannot move a membership to B');

select tests.clear_authentication();

select is((select name from public.organizations where id = tests.org_id('centre-b')), 'Centre B',
  'organization B unchanged');
select is((select timezone from public.organization_settings where organization_id = tests.org_id('centre-b')),
  'Europe/Paris', 'settings of B unchanged');
select is((select name from public.companies where organization_id = tests.org_id('centre-b')), 'Entreprise B',
  'company of B unchanged and not deleted');
select is((select name from public.funders where organization_id = tests.org_id('centre-b')), 'Financeur B',
  'funder of B unchanged and not deleted');
select is((select count(*) from public.roles where organization_id = tests.org_id('centre-b') and name = 'hacked'),
  0::bigint, 'roles of B not renamed');
select is((select count(*) from public.roles where organization_id = tests.org_id('centre-b') and name = 'custom_b'),
  1::bigint, 'custom role of B not deleted');
select is((select count(*) from public.role_permissions where organization_id = tests.org_id('centre-b')),
  (select count(*) from public.role_permissions where organization_id = tests.org_id('centre-a'))
    - 3 + 1, 'permissions of B not deleted');
select is((select count(*) from public.memberships where organization_id = tests.org_id('centre-b') and status = 'active'),
  2::bigint, 'memberships of B unchanged and not deleted');
select is((select first_name from public.profiles where id = tests.uid('owner_b')), 'owner_b',
  'profile of B member unchanged');

-- ---------------------------------------------------------------------------
-- Other users of A
-- ---------------------------------------------------------------------------

-- multi: learner in A, admin_staff in B. B rights never apply to A.
select tests.authenticate_as('multi');
select is((select count(*) from public.companies where organization_id = tests.org_id('centre-b')), 1::bigint,
  'multi reads companies of B (admin_staff there)');
select is((select count(*) from public.companies where organization_id = tests.org_id('centre-a')), 0::bigint,
  'multi cannot read companies of A (learner there)');
select throws_ok(
  $$ insert into public.companies (organization_id, name) values (tests.org_id('centre-a'), 'x') $$,
  '42501', null, 'multi cannot use B rights to write in A');

-- Suspended member sees no centre.
select tests.authenticate_as('susp_a');
select is((select count(*) from public.organizations), 0::bigint, 'suspended member sees no organization');
select is((select count(*) from public.companies), 0::bigint, 'suspended member sees no company');

-- No membership: nothing.
select tests.authenticate_as('nobody');
select is((select count(*) from public.organizations), 0::bigint, 'user without membership sees nothing');

-- Company tutor: sees only their own company.
select tests.authenticate_as('tutor_a');
select is((select count(*) from public.companies), 1::bigint, 'tutor sees only their own company');

-- Anonymous: no table access at all.
select tests.authenticate_as_anon();
select throws_ok($$ select count(*) from public.organizations $$, '42501', null,
  'anon cannot read organizations');

select tests.clear_authentication();
select * from finish();
rollback;
