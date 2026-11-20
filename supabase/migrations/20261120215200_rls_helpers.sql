-- RLS helpers. All: security definer (they read memberships/roles without
-- triggering RLS recursion), stable, empty search_path, fully qualified names.
-- They only ever look at the CURRENT user (auth.uid()); none takes a user id,
-- so they cannot be used to probe someone else's access.
--
-- Usage in policies: `organization_id in (select private.org_ids_with_permission(...))`
-- The sub-select lets Postgres evaluate the function once per statement.

-- Is this permission resource tied to a (paid) module?
create function private.is_module_resource(p_resource public.permission_resource)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_resource::text = any (enum_range(null::public.app_module)::text[]);
$$;

-- Centres where the current user has an active membership.
create function private.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct m.organization_id
    from public.memberships m
   where m.user_id = (select auth.uid())
     and m.status = 'active';
$$;

-- Centres where the current user holds a permission through an active staff
-- membership, IGNORING whether the module is enabled. Used for escalation
-- checks ("can only grant what you hold"), never to authorize data access.
create function private.org_ids_holding_permission(
  p_resource public.permission_resource,
  p_action public.permission_action
)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct m.organization_id
    from public.memberships m
    join public.roles r on r.id = m.role_id
   where m.user_id = (select auth.uid())
     and m.status = 'active'
     and r.kind = 'staff'
     and (
       r.is_owner
       or exists (
         select 1
           from public.role_permissions p
          where p.role_id = r.id
            and p.resource = p_resource
            and p.action = p_action
       )
     );
$$;

-- Centres where the current user may perform p_action on p_resource:
-- active membership + permission granted (or owner) + module enabled.
-- This is the "module checked in RLS" guarantee from CLAUDE.md.
create function private.org_ids_with_permission(
  p_resource public.permission_resource,
  p_action public.permission_action
)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select h.org_id
    from private.org_ids_holding_permission(p_resource, p_action) as h (org_id)
    join public.organization_settings s on s.organization_id = h.org_id
   where not private.is_module_resource(p_resource)
      or p_resource::text = any (s.enabled_modules::text[]);
$$;

-- Boolean form, for use inside triggers and checks on a known centre.
create function private.has_permission(
  p_org uuid,
  p_resource public.permission_resource,
  p_action public.permission_action
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.org_ids_with_permission(p_resource, p_action) as o (org_id)
     where o.org_id = p_org
  );
$$;

create function private.holds_permission(
  p_org uuid,
  p_resource public.permission_resource,
  p_action public.permission_action
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.org_ids_holding_permission(p_resource, p_action) as o (org_id)
     where o.org_id = p_org
  );
$$;

-- Is the current user an active owner of this centre?
create function private.is_org_owner(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.memberships m
      join public.roles r on r.id = m.role_id
     where m.user_id = (select auth.uid())
       and m.organization_id = p_org
       and m.status = 'active'
       and r.is_owner
  );
$$;

-- Roles held (actively) by the current user.
create function private.user_role_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.role_id
    from public.memberships m
   where m.user_id = (select auth.uid())
     and m.status = 'active';
$$;

create function private.is_owner_role(p_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select r.is_owner from public.roles r where r.id = p_role_id), false);
$$;

-- Can the current user hand out (or manage members holding) this role?
-- Owners can assign anything in their centre. Others: never the owner role,
-- and only roles whose permissions are a subset of their own.
create function private.can_assign_role(p_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when r.id is null then false
    when private.is_org_owner(r.organization_id) then true
    when r.is_owner then false
    else not exists (
      select 1
        from public.role_permissions p
       where p.role_id = r.id
         and not private.holds_permission(p.organization_id, p.resource, p.action)
    )
  end
  from (select 1) as one
  left join public.roles r on r.id = p_role_id;
$$;

-- Does the centre keep at least one other active owner membership?
-- Prevents leaving a centre without anyone able to manage it.
create function private.org_has_other_active_owner(p_org uuid, p_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.memberships m
      join public.roles r on r.id = m.role_id
     where m.organization_id = p_org
       and m.id <> p_membership_id
       and m.status = 'active'
       and r.is_owner
  );
$$;

-- Profiles the current user may see: their own, plus members of centres
-- where they have team:read.
create function private.visible_profile_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid())
  union
  select m.user_id
    from public.memberships m
   where m.organization_id in (select private.org_ids_with_permission('team', 'read'));
$$;

-- Companies / funders the current user is attached to (company or funder accounts).
create function private.user_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.company_id
    from public.memberships m
   where m.user_id = (select auth.uid())
     and m.status = 'active'
     and m.company_id is not null;
$$;

create function private.user_funder_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.funder_id
    from public.memberships m
   where m.user_id = (select auth.uid())
     and m.status = 'active'
     and m.funder_id is not null;
$$;

-- Billing accounts owned by the current user.
create function private.user_billing_account_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id from public.billing_accounts b where b.owner_id = (select auth.uid());
$$;

-- MFA level of the current session (for sensitive tables, via restrictive policies).
create function private.is_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

-- Platform super admin (server-side checks only; never used to bypass RLS).
create function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.platform_admins a where a.user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Privileges: nothing in private is callable by default; policies need EXECUTE
-- on the helpers for the authenticated role only.
-- ---------------------------------------------------------------------------
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

grant execute on function
  private.is_module_resource(public.permission_resource),
  private.user_org_ids(),
  private.org_ids_holding_permission(public.permission_resource, public.permission_action),
  private.org_ids_with_permission(public.permission_resource, public.permission_action),
  private.has_permission(uuid, public.permission_resource, public.permission_action),
  private.holds_permission(uuid, public.permission_resource, public.permission_action),
  private.is_org_owner(uuid),
  private.user_role_ids(),
  private.is_owner_role(uuid),
  private.can_assign_role(uuid),
  private.org_has_other_active_owner(uuid, uuid),
  private.visible_profile_ids(),
  private.user_company_ids(),
  private.user_funder_ids(),
  private.user_billing_account_ids(),
  private.is_aal2()
to authenticated;

-- Private tables: RLS on, no policy = deny all (service_role bypasses RLS).
alter table private.platform_admins enable row level security;
alter table private.platform_audit_log enable row level security;
