-- Multi-tenant core: billing accounts, organizations (centres), profiles, roles,
-- permissions, memberships, companies, funders, organization settings.
--
-- Hierarchy: billing_account (paying customer) -> organization (centre = company)
--            -> site -> room (sites/rooms come with the planning module).
-- Tenant boundary = organization. Every business table carries organization_id.

-- ---------------------------------------------------------------------------
-- Private schema (helpers, platform tables). Never exposed through the Data API.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
-- RLS policies call private helpers with the caller's privileges.
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Enums (values can be added later, never removed: choose names carefully)
-- ---------------------------------------------------------------------------
create type public.role_kind as enum ('staff', 'trainer', 'learner', 'company', 'funder');

create type public.membership_status as enum ('invited', 'active', 'suspended');

create type public.center_type as enum ('of', 'cfa', 'regulated');

create type public.app_module as enum (
  'planning',
  'attendance',
  'documents',
  'evaluations',
  'quality',
  'crm',
  'billing',
  'companies',
  'funders',
  'news'
);

-- Resources of the CRUD permission grid: every app_module + core resources
-- that are always available (not tied to a paid module).
create type public.permission_resource as enum (
  'planning',
  'attendance',
  'documents',
  'evaluations',
  'quality',
  'crm',
  'billing',
  'companies',
  'funders',
  'news',
  'team',
  'roles',
  'settings',
  'subscription'
);

create type public.permission_action as enum ('create', 'read', 'update', 'delete');

create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one per auth user, global (a person can belong to several centres).
-- Intentionally no organization_id: centre-specific data lives in memberships.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 100),
  last_name text not null default '' check (char_length(last_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- billing_accounts: the paying customer. Above the tenant boundary.
-- Written only by server code (payment webhook / create_organization).
-- ---------------------------------------------------------------------------
create table public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  -- restrict: deleting the owner's account requires an ownership transfer first.
  owner_id uuid not null references public.profiles (id) on delete restrict,
  plan_code text not null default 'trial' check (plan_code ~ '^[a-z0-9_]{1,40}$'),
  subscription_status public.subscription_status not null default 'trialing',
  -- Centres included in the plan (1 for the smallest plan, up to 5).
  included_organizations integer not null default 1 check (included_organizations between 1 and 5),
  -- Extra centres bought on top of the plan (monthly fee each).
  extra_organizations integer not null default 0 check (extra_organizations >= 0),
  -- Modules of the plan. Propagated to organization_settings.enabled_modules.
  enabled_modules public.app_module[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index billing_accounts_owner_id_idx on public.billing_accounts (owner_id);

-- ---------------------------------------------------------------------------
-- organizations: a centre = a company (SIREN). Root of the tenant.
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references public.billing_accounts (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$'),
  center_type public.center_type not null default 'of',
  siren text check (siren ~ '^[0-9]{9}$'),
  -- TODO: valider avec un juriste : format et contrôle du numéro de déclaration d'activité (NDA).
  nda text check (char_length(nda) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organizations_billing_account_id_idx on public.organizations (billing_account_id);

-- ---------------------------------------------------------------------------
-- organization_settings: 1-1 with organizations.
-- enabled_modules is derived from the billing account (never written by clients).
-- ---------------------------------------------------------------------------
create table public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  enabled_modules public.app_module[] not null default '{}',
  timezone text not null default 'Europe/Paris' check (char_length(timezone) <= 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- companies / funders: scope for company and funder accounts.
-- unique (id, organization_id) lets memberships reference them with a
-- composite FK, so a membership can only point to a company of its own centre.
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  siret text check (siret ~ '^[0-9]{14}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create index companies_organization_id_idx on public.companies (organization_id);

create table public.funders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create index funders_organization_id_idx on public.funders (organization_id);

-- ---------------------------------------------------------------------------
-- roles: defined per centre. kind decides the portal and data scope;
-- the CRUD grid (role_permissions) only applies to staff roles.
-- System roles carry a system_key; the UI translates them from message files.
-- The owner role has every permission implicitly.
-- ---------------------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  kind public.role_kind not null,
  system_key text check (system_key ~ '^[a-z_]{1,40}$'),
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, system_key),
  unique (id, organization_id),
  check (not is_owner or kind = 'staff')
);

-- One owner role per centre (it can be given to several members).
create unique index roles_one_owner_per_org_idx on public.roles (organization_id) where is_owner;

-- ---------------------------------------------------------------------------
-- role_permissions: the CRUD grid. organization_id is denormalized for RLS
-- and kept consistent with the role through the composite FK.
-- ---------------------------------------------------------------------------
create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role_id uuid not null,
  resource public.permission_resource not null,
  action public.permission_action not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (role_id, organization_id) references public.roles (id, organization_id) on delete cascade,
  unique (role_id, resource, action)
);

create index role_permissions_organization_id_idx on public.role_permissions (organization_id);

-- ---------------------------------------------------------------------------
-- memberships: a user's access to a centre, through one role.
-- Several roles = several rows.
-- ---------------------------------------------------------------------------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null,
  status public.membership_status not null default 'invited',
  company_id uuid,
  funder_id uuid,
  invited_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The role, company and funder must belong to the same centre as the membership.
  -- "no action" (checked at end of statement) so deleting a centre cascades cleanly.
  foreign key (role_id, organization_id) references public.roles (id, organization_id),
  foreign key (company_id, organization_id) references public.companies (id, organization_id) on delete cascade,
  foreign key (funder_id, organization_id) references public.funders (id, organization_id) on delete cascade,
  unique (organization_id, user_id, role_id)
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_role_id_idx on public.memberships (role_id);
create index memberships_company_id_idx on public.memberships (company_id);
create index memberships_funder_id_idx on public.memberships (funder_id);
create index memberships_invited_by_idx on public.memberships (invited_by);
-- (organization_id, ...) is covered by the unique constraint above.

-- ---------------------------------------------------------------------------
-- Platform tables (private): super admins and audit log.
-- Super admins never bypass RLS: platform actions go through server code
-- that checks this table, requires MFA (aal2) and logs to the audit log.
-- ---------------------------------------------------------------------------
create table private.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.platform_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) <= 100),
  target_table text check (char_length(target_table) <= 100),
  target_id uuid,
  -- Never put sensitive data (health/disability, social security number, raw GPS) in details.
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index platform_audit_log_actor_id_idx on private.platform_audit_log (actor_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.billing_accounts
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.organization_settings
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.companies
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.funders
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.roles
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.role_permissions
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.memberships
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on private.platform_admins
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Structural integrity triggers (apply to everyone, service_role included)
-- ---------------------------------------------------------------------------

-- A membership's company/funder must match its role kind.
create function private.check_membership_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind public.role_kind;
begin
  select r.kind into v_kind from public.roles r where r.id = new.role_id;

  if v_kind = 'company' then
    if new.company_id is null or new.funder_id is not null then
      raise exception 'membership_scope_invalid: company roles require company_id only'
        using errcode = '23514';
    end if;
  elsif v_kind = 'funder' then
    if new.funder_id is null or new.company_id is not null then
      raise exception 'membership_scope_invalid: funder roles require funder_id only'
        using errcode = '23514';
    end if;
  elsif new.company_id is not null or new.funder_id is not null then
    raise exception 'membership_scope_invalid: only company/funder roles have a scope'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger check_membership_scope before insert or update on public.memberships
  for each row execute function private.check_membership_scope();

-- The CRUD grid only applies to staff roles; the owner role needs no rows.
create function private.check_role_permission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind public.role_kind;
  v_is_owner boolean;
begin
  select r.kind, r.is_owner into v_kind, v_is_owner from public.roles r where r.id = new.role_id;

  if v_kind is distinct from 'staff' then
    raise exception 'role_permission_invalid: permissions only apply to staff roles'
      using errcode = '23514';
  end if;

  if v_is_owner then
    raise exception 'role_permission_invalid: the owner role already has every permission'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger check_role_permission before insert or update on public.role_permissions
  for each row execute function private.check_role_permission();

-- A role's kind and owner flag are fixed once created.
create function private.protect_role_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind is distinct from old.kind
     or new.is_owner is distinct from old.is_owner
     or new.system_key is distinct from old.system_key
     or new.organization_id is distinct from old.organization_id then
    raise exception 'role_immutable: kind, owner flag, system key and centre cannot change'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger protect_role_identity before update on public.roles
  for each row execute function private.protect_role_identity();

-- Plan modules flow from the billing account to each of its centres.
create function private.propagate_enabled_modules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.organization_settings s
     set enabled_modules = new.enabled_modules
    from public.organizations o
   where o.id = s.organization_id
     and o.billing_account_id = new.id;
  return new;
end;
$$;

create trigger propagate_enabled_modules
  after update of enabled_modules on public.billing_accounts
  for each row
  when (new.enabled_modules is distinct from old.enabled_modules)
  execute function private.propagate_enabled_modules();
