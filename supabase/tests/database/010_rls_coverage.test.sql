-- Meta-tests: enforce the RLS golden rule on every table, present and future.
begin;
select plan(10);

-- MFA is mandatory: every public table has a restrictive aal2 policy per operation.
select is(
  (
    select array_agg(c.relname || ':' || op order by 1)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join unnest(array['r', 'a', 'w', 'd']) as op
     where n.nspname = 'public'
       and c.relkind in ('r', 'p')
       and not exists (
         select 1
           from pg_policy p
          where p.polrelid = c.oid
            and not p.polpermissive
            and p.polcmd = op::"char"
            and pg_get_expr(coalesce(p.polqual, p.polwithcheck), p.polrelid) like '%is_aal2()%'
       )
  ),
  null,
  'every public table requires aal2 (restrictive policy) for select/insert/update/delete'
);

select is(
  (
    select array_agg(n.nspname || '.' || c.relname order by 1)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public', 'private')
       and c.relkind in ('r', 'p')
       and not c.relrowsecurity
  ),
  null,
  'every table in public and private has RLS enabled'
);

select is(
  (
    select array_agg(c.relname order by 1)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p')
       and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  ),
  null,
  'every table in public has at least one policy'
);

select is(
  (
    select array_agg(n.nspname || '.' || p.proname order by 1)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private')
       and p.prosecdef
       and not exists (
         select 1 from unnest(coalesce(p.proconfig, '{}')) as cfg where cfg like 'search_path=%'
       )
  ),
  null,
  'every security definer function sets search_path'
);

select ok(
  not has_schema_privilege('anon', 'private', 'usage'),
  'anon has no access to the private schema'
);

select ok(
  not has_function_privilege('anon', 'private.user_org_ids()', 'execute'),
  'anon cannot execute RLS helpers'
);

select ok(
  not has_function_privilege('authenticated', 'private.seed_default_roles(uuid)', 'execute'),
  'authenticated cannot execute internal functions'
);

select ok(
  not has_function_privilege(
    'authenticated', 'public.create_organization(uuid, text, text, public.center_type)', 'execute'
  ),
  'authenticated cannot call create_organization directly'
);

select ok(
  not has_function_privilege(
    'anon', 'public.create_organization(uuid, text, text, public.center_type)', 'execute'
  ),
  'anon cannot call create_organization'
);

select ok(
  not has_table_privilege('authenticated', 'private.platform_admins', 'select'),
  'clients cannot read platform admins'
);

select * from finish();
rollback;
