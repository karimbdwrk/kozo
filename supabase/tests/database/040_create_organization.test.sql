-- Signup and centre creation: profile trigger, create_organization, plan quota,
-- module propagation.
begin;
select plan(17);

select tests.seed_two_centres();

-- ---------------------------------------------------------------------------
-- Signup trigger: profile only
-- ---------------------------------------------------------------------------
select is((select first_name from public.profiles where id = tests.uid('owner_a')), 'owner_a',
  'signup creates the profile from user metadata');
select is((select count(*) from public.memberships where user_id = tests.uid('nobody')), 0::bigint,
  'signup alone creates no membership');
select is((select count(*) from public.billing_accounts where owner_id = tests.uid('nobody')), 0::bigint,
  'signup alone creates no billing account');

-- ---------------------------------------------------------------------------
-- What create_organization produced for centre A
-- ---------------------------------------------------------------------------
select is((select count(*) from public.billing_accounts where owner_id = tests.uid('owner_a')), 1::bigint,
  'first centre creates the billing account');
select is((select count(*) from public.organization_settings where organization_id = tests.org_id('centre-a')), 1::bigint,
  'settings are created with the centre');
select is((select count(*) from public.roles where organization_id = tests.org_id('centre-a') and system_key is not null),
  14::bigint, 'default roles are created');
select is(
  (select r.system_key
     from public.memberships m join public.roles r on r.id = m.role_id
    where m.user_id = tests.uid('owner_a') and m.status = 'active'),
  'direction', 'the creator is an active owner');

-- ---------------------------------------------------------------------------
-- Plan quota
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ select public.create_organization(tests.uid('owner_a'), 'Centre A2', 'centre-a2') $$,
  'P0001', 'organization_quota_reached', 'smallest plan: one centre only');

update public.billing_accounts set extra_organizations = 1 where owner_id = tests.uid('owner_a');

select lives_ok(
  $$ select public.create_organization(tests.uid('owner_a'), 'Centre A2', 'centre-a2') $$,
  'an extra centre can be created once bought');
select is(
  (select o.billing_account_id from public.organizations o where o.slug = 'centre-a2'),
  (select o.billing_account_id from public.organizations o where o.slug = 'centre-a'),
  'the extra centre belongs to the same billing account');
select is(
  (select enabled_modules from public.organization_settings where organization_id = tests.org_id('centre-a2')),
  enum_range(null::public.app_module),
  'a new centre inherits the plan modules');

-- ---------------------------------------------------------------------------
-- Module propagation
-- ---------------------------------------------------------------------------
update public.billing_accounts set enabled_modules = '{planning,attendance}'
 where owner_id = tests.uid('owner_a');

select is(
  (select count(*) from public.organization_settings s
     join public.organizations o on o.id = s.organization_id
    where o.billing_account_id = (select id from public.billing_accounts where owner_id = tests.uid('owner_a'))
      and s.enabled_modules = '{planning,attendance}'),
  2::bigint, 'plan modules propagate to every centre of the account');

-- ---------------------------------------------------------------------------
-- Input checks
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ select public.create_organization(tests.uid('nobody'), 'Admin', 'admin') $$,
  '22023', 'slug_reserved', 'reserved slugs are refused');
select throws_ok(
  $$ select public.create_organization(tests.uid('nobody'), 'Centre B bis', 'centre-b') $$,
  '23505', null, 'slugs are unique');
select throws_ok(
  $$ select public.create_organization(tests.uid('nobody'), 'Bad', 'Bad Slug') $$,
  '23514', null, 'invalid slugs are refused');

select tests.create_user('unconfirmed', false);
select throws_ok(
  $$ select public.create_organization(tests.uid('unconfirmed'), 'Centre U', 'centre-u') $$,
  '42501', 'email_not_confirmed', 'email must be confirmed');

-- ---------------------------------------------------------------------------
-- Clients cannot call it
-- ---------------------------------------------------------------------------
select tests.authenticate_as('nobody');
select throws_ok(
  $$ select public.create_organization(tests.uid('nobody'), 'Centre N', 'centre-n') $$,
  '42501', null, 'authenticated users cannot call create_organization');

select tests.clear_authentication();
select * from finish();
rollback;
