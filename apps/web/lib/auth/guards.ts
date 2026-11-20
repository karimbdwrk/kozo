import "server-only";

import { resolveAuthStep, toAuthenticatorLevel } from "@kozo/shared";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

// Server-side guards. The proxy is only a first gate: every page and Server
// Action that touches data calls these again, and RLS checks once more.

// getUser() validates the session with the Auth server (never getSession()).
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

// MFA is mandatory: data access requires a session that verified its TOTP.
export async function requireAal2(): Promise<User> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const step = resolveAuthStep({
    hasSession: true,
    currentLevel: toAuthenticatorLevel(data?.currentLevel),
    nextLevel: toAuthenticatorLevel(data?.nextLevel),
  });
  if (step === "enroll-mfa") redirect("/mfa/enroll");
  if (step === "verify-mfa") redirect("/mfa/verify");
  return user;
}
