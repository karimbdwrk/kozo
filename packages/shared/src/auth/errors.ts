// Supabase Auth error codes -> message keys, shared by web and mobile.
// Anything unknown maps to a generic message: never show raw technical errors,
// never reveal whether an account exists.

export const GENERIC_ERROR_KEY = "common.genericError";

const AUTH_ERROR_KEYS: Readonly<Record<string, string>> = {
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

export function authErrorMessageKey(code: string | null | undefined): string {
  return (code && AUTH_ERROR_KEYS[code]) || GENERIC_ERROR_KEY;
}
