import "server-only";

import type { Database } from "@kozo/shared";
import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

// Supabase client with the SECRET key: bypasses RLS.
// Server-only (the "server-only" import breaks the build if a client file imports it).
// Use only after authorizing the user yourself, for operations RLS cannot express
// (e.g. create_organization, inviting a user).
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not configured");
  }

  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
