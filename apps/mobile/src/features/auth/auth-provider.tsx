import { resolveAuthStep, toAuthenticatorLevel, type AuthStep } from "@kozo/shared";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase";

type AuthContextValue = { loading: boolean; step: AuthStep };

const AuthContext = createContext<AuthContextValue>({ loading: true, step: "sign-in" });

async function computeStep(): Promise<AuthStep> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return "sign-in";

  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return resolveAuthStep({
    hasSession: true,
    currentLevel: toAuthenticatorLevel(data?.currentLevel),
    nextLevel: toAuthenticatorLevel(data?.nextLevel),
  });
}

// Tracks where the user is in the flow: sign in -> TOTP (mandatory) -> app.
// Routing uses it to show only the allowed screens; the database enforces
// the same rule (aal2 required by RLS), so this is UX, not the security boundary.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<AuthContextValue>({ loading: true, step: "sign-in" });

  useEffect(() => {
    let active = true;
    const refresh = () => {
      computeStep()
        .then((step) => active && setValue({ loading: false, step }))
        .catch(() => active && setValue({ loading: false, step: "sign-in" }));
    };

    refresh();
    // Defer: calling Supabase inside the callback itself can deadlock the auth lock.
    const { data } = supabase.auth.onAuthStateChange(() => {
      setTimeout(refresh, 0);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
