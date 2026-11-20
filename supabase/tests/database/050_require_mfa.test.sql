-- MFA is mandatory: a session that has not verified its TOTP (aal1) gets nothing,
-- even for the owner of the centre.
begin;
select plan(12);

select tests.seed_two_centres();

select tests.authenticate_as('owner_a', 'aal1');

select is((select count(*) from public.profiles), 0::bigint, 'aal1: no profile visible');
select is((select count(*) from public.billing_accounts), 0::bigint, 'aal1: no billing account visible');
select is((select count(*) from public.organizations), 0::bigint, 'aal1: no organization visible');
select is((select count(*) from public.organization_settings), 0::bigint, 'aal1: no settings visible');
select is((select count(*) from public.memberships), 0::bigint, 'aal1: no membership visible');
select is((select count(*) from public.roles), 0::bigint, 'aal1: no role visible');
select is((select count(*) from public.role_permissions), 0::bigint, 'aal1: no permission visible');
select is((select count(*) from public.companies), 0::bigint, 'aal1: no company visible');
select is((select count(*) from public.funders), 0::bigint, 'aal1: no funder visible');

select throws_ok(
  $$ insert into public.companies (organization_id, name) values (tests.org_id('centre-a'), 'x') $$,
  '42501', null, 'aal1: cannot insert');

update public.organizations set name = 'renamed' where id = tests.org_id('centre-a');

-- Same user, after verifying TOTP: full access to their centre again.
select tests.authenticate_as('owner_a', 'aal2');
select is((select count(*) from public.organizations), 1::bigint, 'aal2: the owner sees their centre');

select tests.clear_authentication();
select is((select name from public.organizations where id = tests.org_id('centre-a')), 'Centre A',
  'aal1: cannot update');

select * from finish();
rollback;
