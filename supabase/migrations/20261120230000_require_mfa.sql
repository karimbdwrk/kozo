-- MFA (TOTP) is mandatory for everyone.
-- Enforced in the database, not only in the apps: a session that has not
-- completed its second factor (aal1) cannot read or write any business data.
--
-- Restrictive policies are AND-ed with the permissive ones, so they only add a
-- condition. One per table and per operation. service_role bypasses RLS
-- (server-side flows such as create_organization are unaffected).

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'profiles',
    'billing_accounts',
    'organizations',
    'organization_settings',
    'companies',
    'funders',
    'roles',
    'role_permissions',
    'memberships'
  ]
  loop
    execute format(
      'create policy %I on public.%I as restrictive for select to authenticated using ((select private.is_aal2()))',
      v_table || '_require_aal2_select', v_table
    );
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check ((select private.is_aal2()))',
      v_table || '_require_aal2_insert', v_table
    );
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated using ((select private.is_aal2())) with check ((select private.is_aal2()))',
      v_table || '_require_aal2_update', v_table
    );
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated using ((select private.is_aal2()))',
      v_table || '_require_aal2_delete', v_table
    );
  end loop;
end;
$$;
