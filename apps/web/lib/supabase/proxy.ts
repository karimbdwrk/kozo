import { resolveAuthStep, safeRedirectPath, toAuthenticatorLevel } from "@kozo/shared";
import type { Database } from "@kozo/shared";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

// Pages reachable without a session.
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/check-email",
  "/auth/confirm",
  "/auth/error",
];
// Pages that make no sense once fully signed in.
const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password", "/check-email"];
// Pages allowed while the second factor is not set up / not verified yet.
const ENROLL_ALLOWED_PATHS = ["/mfa/enroll", "/set-password", "/auth/confirm", "/auth/error"];
const VERIFY_ALLOWED_PATHS = ["/mfa/verify", "/auth/confirm", "/auth/error"];

function matches(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Refreshes the Supabase session cookie and enforces the auth flow:
// sign in -> set up / verify TOTP (mandatory for everyone) -> app.
// This is a first gate only: pages, Server Actions and RLS check again.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );

  // getUser() validates the session with the Auth server (never trust getSession()).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Redirects must keep the refreshed session cookies and no-cache headers.
  // `target` is an internal path, possibly with a query string.
  const redirectTo = (target: string, next?: string) => {
    const url = new URL(target, request.url);
    if (next) url.searchParams.set("next", next);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "location") redirect.headers.set(key, value);
    });
    return redirect;
  };

  if (!user) {
    if (matches(pathname, PUBLIC_PATHS)) return response;
    return redirectTo("/login", `${pathname}${search}`);
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const step = resolveAuthStep({
    hasSession: true,
    currentLevel: toAuthenticatorLevel(aal?.currentLevel),
    nextLevel: toAuthenticatorLevel(aal?.nextLevel),
  });

  if (step === "enroll-mfa") {
    if (matches(pathname, ENROLL_ALLOWED_PATHS)) return response;
    return redirectTo("/mfa/enroll");
  }

  if (step === "verify-mfa") {
    if (matches(pathname, VERIFY_ALLOWED_PATHS)) return response;
    const next = matches(pathname, GUEST_ONLY_PATHS)
      ? request.nextUrl.searchParams.get("next")
      : `${pathname}${search}`;
    return redirectTo("/mfa/verify", safeRedirectPath(next));
  }

  // Fully authenticated (aal2).
  if (matches(pathname, GUEST_ONLY_PATHS) || matches(pathname, ["/mfa"])) {
    return redirectTo(safeRedirectPath(request.nextUrl.searchParams.get("next")));
  }

  return response;
}
