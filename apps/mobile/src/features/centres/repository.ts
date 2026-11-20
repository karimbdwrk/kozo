import { supabase } from "@/lib/supabase";

// Data access layer (kept apart from screens so offline support can be added later).
// RLS returns only the centres where the user has an active membership, at aal2.

export type CentreSummary = { name: string; slug: string };

export async function listMyCentres(): Promise<CentreSummary[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("name, slug")
    .order("name")
    .limit(50);
  if (error) throw error;
  return data;
}
