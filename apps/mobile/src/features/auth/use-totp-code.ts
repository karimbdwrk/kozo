import { authErrorMessageKey, totpCodeSchema } from "@kozo/shared";
import { useState } from "react";

import { supabase } from "@/lib/supabase";

// Shared by TOTP setup and verification: validate the 6-digit code, then verify
// it with Supabase. Success upgrades the session to aal2 (the provider reacts).
export function useTotpCode() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const verify = async (factorId: string) => {
    const parsed = totpCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    setError(null);
    setLoading(true);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: parsed.data.code,
    });
    setLoading(false);
    if (verifyError) setError(authErrorMessageKey(verifyError.code));
  };

  return {
    code,
    setCode: (value: string) => setCode(value.replace(/\D/g, "")),
    error,
    setError,
    loading,
    verify,
  };
}
