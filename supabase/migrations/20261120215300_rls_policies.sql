-- RLS policies and grants, one policy per operation.
-- Grants are explicit: start from nothing, then allow only what clients need,
-- column by column for updates (RLS filters rows, grants filter columns).
-- service_role keeps full access and bypasses RLS (server code only).

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere and reset client privileges
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.companies enable row level security;
alter table public.funders enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships enable row level security;

revoke all on
  public.profiles,
  public.billing_accounts,
  public.organizations,
  public.organization_settings,
  public.companies,
  public.funders,
  public.roles,
  public.role_permissions,
  public.memberships
from anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (first_name, last_name) on public.profiles to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id in (select private.visible_profile_ids()));

-- insert: none (created by the auth.users trigger)

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- delete: none (account deletion is a server-side flow)

-- ---------------------------------------------------------------------------
-- billing_accounts: read by the owner only; written by server code only
-- (payment webhook, create_organization).
-- ---------------------------------------------------------------------------
grant select on public.billing_accounts to authenticated;

create policy billing_accounts_select on public.billing_accounts
  for select to authenticated
  using (owner_id = (select auth.uid()));

-- insert / update / delete: none

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
grant select on public.organizations to authenticated;
grant update (name, siren, nda) on public.organizations to authenticated;

create policy organizations_select on public.organizations
  for select to authenticated
  using (id in (select private.user_org_ids()));

-- insert: none (create_organization, server-side, checks the plan quota)

create policy organizations_update on public.organizations
  for update to authenticated
  using (id in (select private.org_ids_with_permission('settings', 'update')))
  with check (id in (select private.org_ids_with_permission('settings', 'update')));

-- delete: none (platform operation; soft delete later)

-- ---------------------------------------------------------------------------
-- organization_settings (enabled_modules is never writable by clients)
-- ---------------------------------------------------------------------------
grant select on public.organization_settings to authenticated;
grant update (timezone) on public.organization_settings to authenticated;

create policy organization_settings_select on public.organization_settings
  for select to authenticated
  using (organization_id in (select private.user_org_ids()));

-- insert: none (created with the organization)

create policy organization_settings_update on public.organization_settings
  for update to authenticated
  using (organization_id in (select private.org_ids_with_permission('settings', 'update')))
  with check (organization_id in (select private.org_ids_with_permission('settings', 'update')));

-- delete: none

-- ---------------------------------------------------------------------------
-- companies (module: companies)
-- ---------------------------------------------------------------------------
grant select on public.companies to authenticated;
grant insert (organization_id, name, siret) on public.companies to authenticated;
grant update (name, siret) on public.companies to authenticated;
grant delete on public.companies to authenticated;

create policy companies_select on public.companies
  for select to authenticated
  using (
    organization_id in (select private.org_ids_with_permission('companies', 'read'))
    or id in (select private.user_company_ids())
  );

create policy companies_insert on public.companies
  for insert to authenticated
  with check (organization_id in (select private.org_ids_with_permission('companies', 'create')));

create policy companies_update on public.companies
  for update to authenticated
  using (organization_id in (select private.org_ids_with_permission('companies', 'update')))
  with check (organization_id in (select private.org_ids_with_permission('companies', 'update')));

create policy companies_delete on public.companies
  for delete to authenticated
  using (organization_id in (select private.org_ids_with_permission('companies', 'delete')));

-- ---------------------------------------------------------------------------
-- funders (module: funders)
-- ---------------------------------------------------------------------------
grant select on public.funders to authenticated;
grant insert (organization_id, name) on public.funders to authenticated;
grant update (name) on public.funders to authenticated;
grant delete on public.funders to authenticated;

create policy funders_select on public.funders
  for select to authenticated
  using (
    organization_id in (select private.org_ids_with_permission('funders', 'read'))
    or id in (select private.user_funder_ids())
  );

create policy funders_insert on public.funders
  for insert to authenticated
  with check (organization_id in (select private.org_ids_with_permission('funders', 'create')));

create policy funders_update on public.funders
  for update to authenticated
  using (organization_id in (select private.org_ids_with_permission('funders', 'update')))
  with check (organization_id in (select private.org_ids_with_permission('funders', 'update')));

create policy funders_delete on public.funders
  for delete to authenticated
  using (organization_id in (select private.org_ids_with_permission('funders', 'delete')));

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
grant select on public.roles to authenticated;
grant insert (organization_id, name, kind) on public.roles to authenticated;
grant update (name) on public.roles to authenticated;
grant delete on public.roles to authenticated;

create policy roles_select on public.roles
  for select to authenticated
  using (
    organization_id in (select private.org_ids_with_permission('roles', 'read'))
    or id in (select private.user_role_ids())
  );

-- New custom roles only (system_key / is_owner are not grantable columns).
create policy roles_insert on public.roles
  for insert to authenticated
  with check (organization_id in (select private.org_ids_with_permission('roles', 'create')));

create policy roles_update on public.roles
  for update to authenticated
  using (organization_id in (select private.org_ids_with_permission('roles', 'update')))
  with check (organization_id in (select private.org_ids_with_permission('roles', 'update')));

-- System roles (including the owner role) cannot be deleted.
-- A role still assigned to members cannot be deleted either (FK).
create policy roles_delete on public.roles
  for delete to authenticated
  using (
    organization_id in (select private.org_ids_with_permission('roles', 'delete'))
    and system_key is null
    and not is_owner
  );

-- ---------------------------------------------------------------------------
-- role_permissions (no update: remove + add)
-- Anti-escalation: you can only grant/revoke a permission you hold yourself,
-- and you cannot edit a role you hold (owners excepted).
-- ---------------------------------------------------------------------------
grant select on public.role_permissions to authenticated;
grant insert (organization_id, role_id, resource, action) on public.role_permissions to authenticated;
grant delete on public.role_permissions to authenticated;

create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using (
    organization_id in (select private.org_ids_with_permission('roles', 'read'))
    or role_id in (select private.user_role_ids())
  );

create policy role_permissions_insert on public.role_permissions
  for insert to authenticated
  with check (
    organization_id in (select private.org_ids_with_permission('roles', 'update'))
    and (
      private.is_org_owner(organization_id)
      or (
        private.holds_permission(organization_id, resource, action)
        and role_id not in (select private.user_role_ids())
      )
    )
  );

create policy role_permissions_delete on public.role_permissions
  for delete to authenticated
  using (
    organization_id in (select private.org_ids_with_permission('roles', 'update'))
    and (
      private.is_org_owner(organization_id)
      or (
        private.holds_permission(organization_id, resource, action)
        and role_id not in (select private.user_role_ids())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- memberships (changing a member's role = remove + add; only status is updatable)
-- ---------------------------------------------------------------------------
grant select on public.memberships to authenticated;
grant insert (organization_id, user_id, role_id, status, company_id, funder_id)
  on public.memberships to authenticated;
grant update (status) on public.memberships to authenticated;
grant delete on public.memberships to authenticated;

create policy memberships_select on public.memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or organization_id in (select private.org_ids_with_permission('team', 'read'))
  );

create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (
    organization_id in (select private.org_ids_with_permission('team', 'create'))
    and private.can_assign_role(role_id)
  );

create policy memberships_update on public.memberships
  for update to authenticated
  using (
    organization_id in (select private.org_ids_with_permission('team', 'update'))
    and private.can_assign_role(role_id)
  )
  with check (
    organization_id in (select private.org_ids_with_permission('team', 'update'))
    and private.can_assign_role(role_id)
    and (
      status = 'active'
      or not private.is_owner_role(role_id)
      or private.org_has_other_active_owner(organization_id, id)
    )
  );

create policy memberships_delete on public.memberships
  for delete to authenticated
  using (
    organization_id in (select private.org_ids_with_permission('team', 'delete'))
    and private.can_assign_role(role_id)
    and (
      not private.is_owner_role(role_id)
      or private.org_has_other_active_owner(organization_id, id)
    )
  );
