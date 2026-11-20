import { authErrorMessageKey, signInSchema } from "@kozo/shared";
import { useState } from "react";
import { Text } from "react-native";

import { Button } from "@/components/button";
import { FormError, Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { t } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type FieldErrors = Partial<Record<"email" | "password", string>>;

// No sign-up in the app: learners and trainers are invited by their centre.
export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "email" || field === "password") errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    // On success, the auth provider moves the user to the TOTP step.
    if (signInError) setError(authErrorMessageKey(signInError.code));
  };

  return (
    <Screen title={t("auth.signIn.title")} description={t("auth.signIn.description")}>
      <FormError error={error} />
      <TextField
        label={t("auth.fields.email")}
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
      />
      <TextField
        label={t("auth.fields.password")}
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={() => void submit()}
      />
      <Button label={t("auth.signIn.submit")} loading={loading} onPress={() => void submit()} />
      <Text className="text-muted-foreground text-sm">{t("auth.signIn.forgotPassword")}</Text>
    </Screen>
  );
}
