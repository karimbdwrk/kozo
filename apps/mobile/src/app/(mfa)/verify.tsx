import { authErrorMessageKey } from "@kozo/shared";
import { useState } from "react";
import { Text } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { useTotpCode } from "@/features/auth/use-totp-code";
import { t } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export default function MfaVerifyScreen() {
  const totp = useTotpCode();
  const [signingOut, setSigningOut] = useState(false);

  const verify = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp[0];
    if (error || !factor) {
      totp.setError(authErrorMessageKey(error?.code));
      return;
    }
    await totp.verify(factor.id);
  };

  return (
    <Screen title={t("auth.mfaVerify.title")} description={t("auth.mfaVerify.description")}>
      <TextField
        label={t("auth.fields.totpCode")}
        value={totp.code}
        onChangeText={totp.setCode}
        error={totp.error}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        autoFocus
        onSubmitEditing={() => void verify()}
      />
      <Button
        label={t("auth.mfaVerify.submit")}
        loading={totp.loading}
        onPress={() => void verify()}
      />
      <Text className="text-muted-foreground text-sm">{t("auth.mfaVerify.lostDevice")}</Text>
      <Button
        label={t("common.signOut")}
        variant="ghost"
        loading={signingOut}
        onPress={() => {
          setSigningOut(true);
          void supabase.auth.signOut().finally(() => setSigningOut(false));
        }}
      />
    </Screen>
  );
}
