import "server-only";

import type { Enums } from "@kozo/shared";
import { notFound } from "next/navigation";
import { cache } from "react";

import { requireAal2 } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

type Resource = Enums<"permission_resource">;
type Action = Enums<"permission_action">;
type AppModule = Enums<"app_module">;
type RoleKind = Enums<"role_kind">;

export type CentreContext = {
  organization: { id: string; name: string; slug: string };
  isOwner: boolean;
  roleKinds: ReadonlySet<RoleKind>;
  permissions: ReadonlySet<`${Resource}:${Action}`>;
  enabledModules: ReadonlySet<AppModule>;
};

// The current user's access to a centre, read AS THE USER (RLS applies:
// a centre they are not an active member of is simply invisible).
// Used to filter navigation and to fail fast; RLS remains the real guard.
export const getCentreContext = cache(async (slug: string): Promise<CentreContext | null> => {
  const user = await requireAal2();
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!organization) return null;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role_id")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .eq("status", "active");
  const roleIds = (memberships ?? []).map((m) => m.role_id);
  if (roleIds.length === 0) return null;

  const [{ data: roles }, { data: grants }, { data: settings }] = await Promise.all([
    supabase.from("roles").select("id, kind, is_owner").in("id", roleIds),
    supabase.from("role_permissions").select("resource, action").in("role_id", roleIds),
    supabase
      .from("organization_settings")
      .select("enabled_modules")
      .eq("organization_id", organization.id)
      .maybeSingle(),
  ]);

  return {
    organization,
    isOwner: (roles ?? []).some((r) => r.is_owner),
    roleKinds: new Set((roles ?? []).map((r) => r.kind)),
    permissions: new Set((grants ?? []).map((g) => `${g.resource}:${g.action}` as const)),
    enabledModules: new Set(settings?.enabled_modules ?? []),
  };
});

export async function requireCentre(slug: string): Promise<CentreContext> {
  const context = await getCentreContext(slug);
  // 404 rather than 403: do not reveal whether a centre exists.
  if (!context) notFound();
  return context;
}

const MODULE_RESOURCES: ReadonlySet<string> = new Set<AppModule>([
  "planning",
  "attendance",
  "documents",
  "evaluations",
  "quality",
  "crm",
  "billing",
  "companies",
  "funders",
  "news",
]);

export function hasModule(context: CentreContext, module: AppModule): boolean {
  return context.enabledModules.has(module);
}

// Same rule as private.org_ids_with_permission in the database.
export function can(context: CentreContext, resource: Resource, action: Action): boolean {
  if (MODULE_RESOURCES.has(resource) && !context.enabledModules.has(resource as AppModule)) {
    return false;
  }
  if (!context.roleKinds.has("staff")) return false;
  return context.isOwner || context.permissions.has(`${resource}:${action}`);
}

export function requireModule(context: CentreContext, module: AppModule): void {
  if (!hasModule(context, module)) notFound();
}

export function requirePermission(
  context: CentreContext,
  resource: Resource,
  action: Action,
): void {
  if (!can(context, resource, action)) notFound();
}

// CLAUDE.md's requireRole: roles are per-centre data, so the stable check is the role kind.
export function requireRoleKind(context: CentreContext, kinds: readonly RoleKind[]): void {
  if (!kinds.some((kind) => context.roleKinds.has(kind))) notFound();
}
