import type { z } from "zod";

// Result of a form Server Action. Errors are message keys (translated in the UI).
export type ActionState = {
  error: string | null;
  fieldErrors?: Partial<Record<string, string>>;
  // Free-form data returned on success when the action does not redirect.
  data?: Record<string, string>;
};

export const initialActionState: ActionState = { error: null };

export function fromZodError(error: z.ZodError): ActionState {
  const fieldErrors: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".");
    fieldErrors[field] ??= issue.message;
  }
  return { error: null, fieldErrors };
}

// Supabase Auth error codes -> message keys. Anything else is generic:
// never show raw technical errors, never reveal whether an account exists.
const AUTH_ERROR_KEYS: Record<string, string> = {
  invalid_credentials: "auth.errors.invalidCredentials",
  email_not_confirmed: "auth.errors.emailNotConfirmed",
  over_request_rate_limit: "auth.errors.tooManyRequests",
  over_email_send_rate_limit: "auth.errors.tooManyRequests",
  weak_password: "auth.errors.weakPassword",
  same_password: "auth.errors.samePassword",
  mfa_verification_failed: "auth.errors.totpWrong",
  mfa_challenge_expired: "auth.errors.totpWrong",
  otp_expired: "auth.errors.linkInvalid",
};

export function fromAuthError(error: { code?: string | undefined } | null): ActionState {
  const key = (error?.code && AUTH_ERROR_KEYS[error.code]) || "common.genericError";
  return { error: key };
}
