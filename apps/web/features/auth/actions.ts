"use server";

import {
  forgotPasswordSchema,
  safeRedirectPath,
  setPasswordSchema,
  signInSchema,
  signUpSchema,
  totpCodeSchema,
} from "@kozo/shared";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

import { fromAuthError, fromZodError, type ActionState } from "./action-state";

const TOTP_ISSUER = "Kozo";

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function confirmUrl(origin: string, next: string): string {
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}

// ---------------------------------------------------------------------------
// Sign in / sign up / password
// ---------------------------------------------------------------------------

export async function signIn(_prev: ActionState, input: unknown): Promise<ActionState> {
  const parsed = signInSchema.extend({ next: z.string().optional() }).safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return fromAuthError(error);

  // The proxy then routes to TOTP setup or verification (mandatory).
  redirect(safeRedirectPath(parsed.data.next));
}

export async function signUp(_prev: ActionState, input: unknown): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: confirmUrl(await siteOrigin(), "/onboarding"),
      // Display data only: never used for authorization.
      data: { first_name: parsed.data.firstName, last_name: parsed.data.lastName },
    },
  });
  // An already-registered email gets the same answer (no account enumeration).
  if (error && error.code !== "user_already_exists") return fromAuthError(error);

  redirect("/check-email");
}

export async function requestPasswordReset(
  _prev: ActionState,
  input: unknown,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl(await siteOrigin(), "/set-password"),
  });
  // Same answer whether or not the account exists; only rate limits are surfaced.
  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return fromAuthError(error);
  }

  redirect("/check-email");
}

export async function setPassword(_prev: ActionState, input: unknown): Promise<ActionState> {
  await requireUser();
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fromAuthError(error);

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// TOTP (mandatory for everyone)
// ---------------------------------------------------------------------------

// Creates a new, unverified TOTP factor and returns its QR code and secret.
export async function startMfaEnrollment(): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();

  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return fromAuthError(listError);
  if (factors.totp.length > 0) redirect("/");

  // Abandoned attempts leave unverified factors: remove them first.
  for (const factor of factors.all) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: TOTP_ISSUER,
    friendlyName: TOTP_ISSUER,
  });
  if (error) return fromAuthError(error);

  return {
    error: null,
    data: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret },
  };
}

const enrollVerifySchema = totpCodeSchema.extend({ factorId: z.uuid() });

export async function confirmMfaEnrollment(
  _prev: ActionState,
  input: unknown,
): Promise<ActionState> {
  await requireUser();
  const parsed = enrollVerifySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: parsed.data.factorId,
    code: parsed.data.code,
  });
  if (error) return fromAuthError(error);

  // The session is now aal2.
  redirect("/");
}

export async function verifyMfa(_prev: ActionState, input: unknown): Promise<ActionState> {
  await requireUser();
  const parsed = totpCodeSchema.extend({ next: z.string().optional() }).safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return fromAuthError(listError);
  const factor = factors.totp[0];
  if (!factor) redirect("/mfa/enroll");

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: parsed.data.code,
  });
  if (error) return fromAuthError(error);

  redirect(safeRedirectPath(parsed.data.next));
}
