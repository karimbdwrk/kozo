import { authErrorMessageKey } from "@kozo/shared";
import { useState } from "react";
import { Linking, Text, View } from "react-native";

import { Button } from "@/components/button";
import { FormError, Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { useTotpCode } from "@/features/auth/use-totp-code";
import { t } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type Enrollment = { factorId: string; secret: string; uri: string };

export default function MfaEnrollScreen() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const totp = useTotpCode();

  const start = async () => {
    setStarting(true);
    setStartError(null);
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setStarting(false);
      setStartError(authErrorMessageKey(listError.code));
      return;
    }
    // Abandoned attempts leave unverified factors: remove them first.
    for (const factor of factors.all) {
      if (factor.factor_type === "totp" && factor.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "Kozo",
      friendlyName: "Kozo",
    });
    setStarting(false);
    if (error) {
      setStartError(authErrorMessageKey(error.code));
      return;
    }
    setEnrollment({ factorId: data.id, secret: data.totp.secret, uri: data.totp.uri });
  };

  // On a phone the QR code cannot be scanned by the same device: open the
  // authenticator app through the otpauth:// link, or type the key.
  const openAuthenticator = async () => {
    if (!enrollment) return;
    try {
      await Linking.openURL(enrollment.uri);
    } catch {
      totp.setError("auth.mfaEnroll.cannotOpen");
    }
  };

  return (
    <Screen title={t("auth.mfaEnroll.title")} description={t("auth.mfaEnroll.description")}>
      {!enrollment ? (
        <>
          <FormError error={startError} />
          <Text className="text-foreground text-base">{t("auth.mfaEnroll.step1")}</Text>
          <Button
            label={t("auth.mfaEnroll.start")}
            loading={starting}
            onPress={() => void start()}
          />
        </>
      ) : (
        <>
          <Button
            label={t("auth.mfaEnroll.openApp")}
            variant="ghost"
            onPress={() => void openAuthenticator()}
          />
          <View className="gap-1">
            <Text className="text-muted-foreground text-sm">{t("auth.mfaEnroll.manualKey")}</Text>
            <Text
              selectable
              className="bg-muted text-foreground rounded-lg p-3 font-mono text-base"
            >
              {enrollment.secret}
            </Text>
          </View>
          <TextField
            label={t("auth.fields.totpCode")}
            hint={t("auth.mfaEnroll.step3")}
            value={totp.code}
            onChangeText={totp.setCode}
            error={totp.error}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
          />
          <Button
            label={t("auth.mfaEnroll.submit")}
            loading={totp.loading}
            onPress={() => void totp.verify(enrollment.factorId)}
          />
        </>
      )}
    </Screen>
  );
}
