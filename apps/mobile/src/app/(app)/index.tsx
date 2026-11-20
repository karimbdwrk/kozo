import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { useMyCentres } from "@/features/centres/use-my-centres";
import { t } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

// Placeholder home: schedule, attendance and news come with their modules.
export default function HomeScreen() {
  const { state, reload } = useMyCentres();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Screen title={t("home.title")}>
      {state.status === "loading" ? (
        <ActivityIndicator accessibilityLabel={t("common.loading")} />
      ) : state.status === "error" ? (
        <View className="gap-3">
          <Text accessibilityRole="alert" className="text-destructive">
            {t("common.genericError")}
          </Text>
          <Button label={t("common.retry")} variant="ghost" onPress={reload} />
        </View>
      ) : state.centres.length === 0 ? (
        <Text className="text-muted-foreground text-base">{t("home.empty")}</Text>
      ) : (
        <View className="gap-2">
          {state.centres.map((centre) => (
            <View key={centre.slug} className="border-border rounded-lg border p-4">
              <Text className="text-foreground text-base">{centre.name}</Text>
            </View>
          ))}
        </View>
      )}
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
