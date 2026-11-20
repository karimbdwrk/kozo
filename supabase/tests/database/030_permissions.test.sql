-- Permissions inside a centre: CRUD grid, anti-escalation, owner protection,
-- module gating, structural integrity.
begin;
select plan(27);

select tests.seed_two_centres();

-- ---------------------------------------------------------------------------
-- Learner: no back-office rights
-- ---------------------------------------------------------------------------
select tests.authenticate_as('learner_a');

select throws_ok(
  $$ insert into public.memberships (organization_id, user_id, role_id, status)
     values (tests.org_id('centre-a'), tests.uid('nobody'), tests.role_id('centre-a', 'apprenant'), 'active') $$,
  '42501', null, 'learner cannot add members');
select is((select count(*) from public.memberships), 1::bigint, 'learner only sees their own membership');
select is((select count(*) from public.profiles), 1::bigint, 'learner only sees their own profile');

-- ---------------------------------------------------------------------------
-- admin_staff (team create/read/update, no roles/settings/billing rights)
-- ---------------------------------------------------------------------------
select tests.authenticate_as('staff_a');

select throws_ok(
  $$ insert into public.memberships (organization_id, user_id, role_id, status)
     values (tests.org_id('centre-a'), tests.uid('nobody'), tests.role_id('centre-a', 'direction'), 'active') $$,
  '42501', null, 'staff cannot hand out the owner role');
select throws_ok(
  $$ insert into public.memberships (organization_id, user_id, role_id, status)
     values (tests.org_id('centre-a'), tests.uid('nobody'), tests.role_id('centre-a', 'comptabilite'), 'active') $$,
  '42501', null, 'staff cannot hand out a role with rights they do not hold');
select lives_ok(
  $$ insert into public.memberships (organization_id, user_id, role_id, status)
     values (tests.org_id('centre-a'), tests.uid('nobody'), tests.role_id('centre-a', 'apprenant'), 'invited') $$,
  'staff can invite a learner');
select throws_ok(
  $$ insert into public.role_permissions (organization_id, role_id, resource, action)
     values (tests.org_id('centre-a'), tests.role_id('centre-a', 'admin_staff'), 'billing', 'read') $$,
  '42501', null, 'staff cannot edit the permission grid');
select throws_ok(
  $$ update public.memberships set role_id = tests.role_id('centre-a', 'direction')
     where user_id = tests.uid('staff_a') $$,
  '42501', null, 'nobody can change a membership role in place');
select throws_ok(
  $$ update public.organization_settings set enabled_modules = '{}' $$,
  '42501', null, 'clients cannot change enabled modules');
select throws_ok(
  $$ update public.billing_accounts set included_organizations = 5 $$,
  '42501', null, 'clients cannot change their plan quota');
select is((select count(*) from public.billing_accounts), 0::bigint, 'staff cannot read the billing account');

delete from public.memberships where user_id = tests.uid('learner_a');
update public.organizations set name = 'renamed' where id = tests.org_id('centre-a');

select tests.clear_authentication();
select is((select count(*) from public.memberships where user_id = tests.uid('learner_a')), 1::bigint,
  'staff without team:delete cannot remove members');
select is((select name from public.organizations where id = tests.org_id('centre-a')), 'Centre A',
  'staff without settings:update cannot rename the centre');

-- ---------------------------------------------------------------------------
-- role_mgr (roles:read/update + team:read only): can only grant what they hold
-- ---------------------------------------------------------------------------
select tests.authenticate_as('role_mgr');

select throws_ok(
  $$ insert into public.role_permissions (organization_id, role_id, resource, action)
     values (tests.org_id('centre-a'), tests.role_id('centre-a', 'qualite'), 'billing', 'read') $$,
  '42501', null, 'cannot grant a permission you do not hold');
select lives_ok(
  $$ insert into public.role_permissions (organization_id, role_id, resource, action)
     values (tests.org_id('centre-a'), tests.role_id('centre-a', 'qualite'), 'roles', 'read') $$,
  'can grant a permission you hold');
select throws_ok(
  $$ insert into public.role_permissions (organization_id, role_id, resource, action)
     values (tests.org_id('centre-a'), tests.role_id('centre-a', 'gestion_roles'), 'team', 'create') $$,
  '42501', null, 'cannot edit the grid of your own role');

-- ---------------------------------------------------------------------------
-- Owner protection: a centre always keeps an active owner
-- ---------------------------------------------------------------------------
select tests.authenticate_as('owner_a');

select throws_ok(
  $$ update public.memberships set status = 'suspended' where user_id = tests.uid('owner_a') $$,
  '42501', null, 'the last owner cannot be suspended');

delete from public.memberships where user_id = tests.uid('owner_a');
delete from public.roles where system_key is not null;

select tests.clear_authentication();
select is((select count(*) from public.memberships where user_id = tests.uid('owner_a')), 1::bigint,
  'the last owner cannot be removed');
select is((select count(*) from public.roles where organization_id = tests.org_id('centre-a') and system_key is not null),
  14::bigint, 'system roles cannot be deleted');

-- ---------------------------------------------------------------------------
-- Module gating: rights on a disabled module give nothing (even to the owner)
-- ---------------------------------------------------------------------------
update public.billing_accounts set enabled_modules = '{planning}'
 where owner_id = tests.uid('owner_a');

select tests.authenticate_as('staff_a');
select is((select count(*) from public.companies), 0::bigint,
  'staff with companies rights sees nothing when the module is disabled');
select tests.authenticate_as('owner_a');
select is((select count(*) from public.companies), 0::bigint,
  'owner sees nothing of a disabled module');
select tests.authenticate_as('tutor_a');
select is((select count(*) from public.companies), 1::bigint,
  'company accounts still see their own company');

-- ---------------------------------------------------------------------------
-- Structural integrity (enforced for everyone, service_role included)
-- ---------------------------------------------------------------------------
select tests.clear_authentication();

select throws_ok(
  $$ insert into public.memberships (organization_id, user_id, role_id, status)
     values (tests.org_id('centre-a'), tests.uid('nobody'), tests.role_id('centre-a', 'entreprise_rh'), 'active') $$,
  '23514', null, 'a company account requires a company');
select throws_ok(
  $$ insert into public.memberships (organization_id, user_id, role_id, status, company_id)
     values (tests.org_id('centre-a'), tests.uid('nobody'), tests.role_id('centre-a', 'formateur'), 'active',
             (select id from public.companies where organization_id = tests.org_id('centre-a'))) $$,
  '23514', null, 'a trainer cannot be attached to a company');
select throws_ok(
  $$ insert into public.memberships (organization_id, user_id, role_id, status)
     values (tests.org_id('centre-a'), tests.uid('nobody'), tests.role_id('centre-b', 'formateur'), 'active') $$,
  '23503', null, 'a role of B cannot be used in A');
select throws_ok(
  $$ insert into public.role_permissions (organization_id, role_id, resource, action)
     values (tests.org_id('centre-a'), tests.role_id('centre-a', 'apprenant'), 'planning', 'read') $$,
  '23514', null, 'the CRUD grid only applies to staff roles');
select throws_ok(
  $$ update public.roles set kind = 'staff' where id = tests.role_id('centre-a', 'apprenant') $$,
  '23514', null, 'a role kind cannot change');

select * from finish();
rollback;
