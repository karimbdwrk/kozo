"use server";

import { createCentreSchema } from "@kozo/shared";
import { redirect } from "next/navigation";

import { fromZodError, type ActionState } from "@/features/auth/action-state";
import { requireAal2 } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

// Database error codes raised by public.create_organization -> message keys.
const CREATE_CENTRE_ERRORS: Record<string, { field?: string; key: string }> = {
  P0001: { key: "onboarding.errors.quotaReached" },
  "23505": { field: "slug", key: "onboarding.errors.slugTaken" },
  "22023": { field: "slug", key: "onboarding.errors.slugReserved" },
  "23514": { field: "slug", key: "onboarding.errors.slugInvalid" },
  "42501": { key: "onboarding.errors.emailNotConfirmed" },
};

export async function createCentre(_prev: ActionState, input: unknown): Promise<ActionState> {
  // Authorize first (signed in + TOTP verified), then validate, then write.
  const user = await requireAal2();
  const parsed = createCentreSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  // create_organization is callable by service_role only. It runs the whole
  // creation in one transaction and enforces the plan quota in SQL.
  // The user id comes from the verified session, never from the client.
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    console.error("create_organization unavailable: SUPABASE_SECRET_KEY is not configured");
    return { error: "common.genericError" };
  }

  const { error } = await admin.rpc("create_organization", {
    p_user_id: user.id,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_center_type: "of",
  });

  if (error) {
    const mapped = error.code ? CREATE_CENTRE_ERRORS[error.code] : undefined;
    if (!mapped) {
      // No user data in logs: only the database error code.
      console.error("create_organization failed", { code: error.code });
      return { error: "common.genericError" };
    }
    return mapped.field
      ? { error: null, fieldErrors: { [mapped.field]: mapped.key } }
      : { error: mapped.key };
  }

  redirect(`/${parsed.data.slug}`);
}
