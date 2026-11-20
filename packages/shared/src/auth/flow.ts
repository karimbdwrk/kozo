// Where a user must go next in the authentication flow.
// Shared by the web proxy and the mobile router so both enforce the same rule:
// MFA (TOTP) is mandatory for everyone.

export type AuthenticatorLevel = "aal1" | "aal2";

export type AuthState =
  | { hasSession: false }
  | {
      hasSession: true;
      currentLevel: AuthenticatorLevel | null;
      // aal2 when the user has a verified factor, aal1 when they have none.
      nextLevel: AuthenticatorLevel | null;
    };

export type AuthStep =
  | "sign-in" // no session
  | "enroll-mfa" // signed in, no TOTP factor yet: must set one up
  | "verify-mfa" // signed in, has a factor, but this session has not verified it
  | "authenticated"; // aal2

// Supabase types the level as an open string: anything unexpected is treated as unknown.
export function toAuthenticatorLevel(value: string | null | undefined): AuthenticatorLevel | null {
  return value === "aal1" || value === "aal2" ? value : null;
}

export function resolveAuthStep(state: AuthState): AuthStep {
  if (!state.hasSession) return "sign-in";
  if (state.currentLevel === "aal2") return "authenticated";
  if (state.nextLevel === "aal2") return "verify-mfa";
  return "enroll-mfa";
}

// Only allow redirects to internal paths (prevents open redirects through ?next=).
export function safeRedirectPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // Control characters (e.g. CR/LF) could be used for header injection.
  if ([...next].some((char) => char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f)) {
    return fallback;
  }
  return next;
}
