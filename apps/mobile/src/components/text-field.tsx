import { Text, TextInput, View, type TextInputProps } from "react-native";

import { t } from "@/lib/i18n";

type TextFieldProps = TextInputProps & {
  label: string;
  // Message key (from zod or Supabase), translated here.
  error?: string | null | undefined;
  hint?: string | undefined;
};

export function TextField({ label, error, hint, ...inputProps }: TextFieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-foreground text-sm font-medium">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        className={`text-foreground min-h-12 rounded-lg border px-3 text-base ${
          error ? "border-destructive" : "border-border"
        }`}
        placeholderTextColor="#737373"
        {...inputProps}
      />
      {hint ? <Text className="text-muted-foreground text-sm">{hint}</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" className="text-destructive text-sm">
          {t(error)}
        </Text>
      ) : null}
    </View>
  );
}
