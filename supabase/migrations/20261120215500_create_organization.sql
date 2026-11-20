-- Centre creation (self-serve onboarding).
-- One transaction: billing account (first centre only) + organization + settings
-- + default roles + owner membership. The plan quota is enforced here, in SQL.
--
-- Callable by service_role only: the web Server Action validates input (zod),
-- authenticates the user with auth.getUser(), then calls this with the user id.
-- Clients cannot call it directly (no rate limit / captcha bypass).

-- Default roles of a new centre. Names are internal keys: the UI translates
-- system roles from its message files (system_key).
-- TODO: valider avec toi les droits par défaut de chaque rôle (modifiables ensuite par le centre).
create function private.seed_default_roles(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role record;
  v_role_id uuid;
begin
  for v_role in
    select *
      from (
        values
          ('direction', 'staff'::public.role_kind, true),
          ('pedagogique', 'staff', false),
          ('admin_staff', 'staff', false),
          ('commercial', 'staff', false),
          ('comptabilite', 'staff', false),
          ('qualite', 'staff', false),
          ('referent_handicap', 'staff', false),
          ('formateur', 'trainer', false),
          ('apprenant', 'learner', false),
          ('entreprise_admin', 'company', false),
          ('entreprise_rh', 'company', false),
          ('entreprise_tuteur', 'company', false),
          ('entreprise_comptabilite', 'company', false),
          ('financeur', 'funder', false)
      ) as t (key, kind, is_owner)
  loop
    insert into public.roles (organization_id, name, kind, system_key, is_owner)
    values (p_org, v_role.key, v_role.kind, v_role.key, v_role.is_owner)
    returning id into v_role_id;

    -- CRUD grid for staff roles (owner = everything, implicitly).
    -- Trainer / learner / company / funder access comes from scoped policies
    -- added with each module (e.g. a trainer only sees their own sessions).
    insert into public.role_permissions (organization_id, role_id, resource, action)
    select p_org, v_role_id, g.resource, g.action
      from (
        select r::public.permission_resource as resource, a::public.permission_action as action
          from (
            values
              ('pedagogique', array['planning', 'attendance', 'documents', 'evaluations', 'quality'], array['create', 'read', 'update', 'delete']),
              ('pedagogique', array['team', 'companies', 'funders', 'news'], array['read']),
              ('admin_staff', array['planning', 'attendance', 'documents', 'companies', 'funders', 'news'], array['create', 'read', 'update', 'delete']),
              ('admin_staff', array['team'], array['create', 'read', 'update']),
              ('commercial', array['crm', 'companies'], array['create', 'read', 'update', 'delete']),
              ('commercial', array['planning', 'funders'], array['read']),
              ('comptabilite', array['billing'], array['create', 'read', 'update', 'delete']),
              ('comptabilite', array['companies', 'funders', 'crm', 'planning', 'attendance', 'subscription'], array['read']),
              ('qualite', array['quality'], array['create', 'read', 'update', 'delete']),
              ('qualite', array['planning', 'attendance', 'documents', 'evaluations', 'team'], array['read']),
              ('referent_handicap', array['planning', 'attendance'], array['read'])
          ) as d (key, resources, actions)
          cross join lateral unnest(d.resources) as r
          cross join lateral unnest(d.actions) as a
         where d.key = v_role.key
      ) as g;
  end loop;
end;
$$;

create function public.create_organization(
  p_user_id uuid,
  p_name text,
  p_slug text,
  p_center_type public.center_type default 'of'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.billing_accounts;
  v_org_id uuid;
  v_owner_role_id uuid;
  v_count integer;
begin
  if p_user_id is null then
    raise exception 'user_required' using errcode = '22004';
  end if;

  -- Email must be confirmed before creating a centre.
  if not exists (
    select 1 from auth.users u
     where u.id = p_user_id
       and u.email_confirmed_at is not null
  ) then
    raise exception 'email_not_confirmed' using errcode = '42501';
  end if;

  -- Slugs used by the app's own routes.
  if lower(p_slug) = any (array[
    'admin', 'api', 'app', 'auth', 'login', 'logout', 'signup', 'register', 'invite',
    'settings', 'portal', 'account', 'billing', 'help', 'support', 'static', 'www', 'kozo'
  ]) then
    raise exception 'slug_reserved' using errcode = '22023';
  end if;

  -- The user's billing account (created with their first centre).
  -- Locked to serialize concurrent creations against the quota.
  select * into v_account
    from public.billing_accounts b
   where b.owner_id = p_user_id
   for update;

  if not found then
    insert into public.billing_accounts (owner_id)
    values (p_user_id)
    returning * into v_account;
  end if;

  select count(*) into v_count
    from public.organizations o
   where o.billing_account_id = v_account.id;

  if v_count >= v_account.included_organizations + v_account.extra_organizations then
    raise exception 'organization_quota_reached' using errcode = 'P0001';
  end if;

  insert into public.organizations (billing_account_id, name, slug, center_type)
  values (v_account.id, btrim(p_name), p_slug, p_center_type)
  returning id into v_org_id;

  insert into public.organization_settings (organization_id, enabled_modules)
  values (v_org_id, v_account.enabled_modules);

  perform private.seed_default_roles(v_org_id);

  select r.id into v_owner_role_id
    from public.roles r
   where r.organization_id = v_org_id
     and r.is_owner;

  insert into public.memberships (organization_id, user_id, role_id, status, invited_by)
  values (v_org_id, p_user_id, v_owner_role_id, 'active', null);

  return v_org_id;
end;
$$;

revoke all on function private.seed_default_roles(uuid) from public, anon, authenticated;
revoke all on function public.create_organization(uuid, text, text, public.center_type)
  from public, anon, authenticated;
grant execute on function public.create_organization(uuid, text, text, public.center_type)
  to service_role;
