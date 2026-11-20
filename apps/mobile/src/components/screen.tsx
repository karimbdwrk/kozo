import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { t } from "@/lib/i18n";

export function Screen({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView className="bg-background flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="gap-6 p-6" keyboardShouldPersistTaps="handled">
          <View className="gap-2">
            <Text accessibilityRole="header" className="text-foreground text-2xl font-semibold">
              {title}
            </Text>
            {description ? (
              <Text className="text-muted-foreground text-base">{description}</Text>
            ) : null}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <View accessibilityRole="alert" className="border-destructive rounded-lg border p-3">
      <Text className="text-destructive">{t(error)}</Text>
    </View>
  );
}
