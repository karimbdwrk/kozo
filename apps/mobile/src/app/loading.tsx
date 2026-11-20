import { ActivityIndicator, View } from "react-native";

import { t } from "@/lib/i18n";

// Shown while the stored session is being restored.
export default function LoadingScreen() {
  return (
    <View className="bg-background flex-1 items-center justify-center">
      <ActivityIndicator accessibilityLabel={t("common.loading")} />
    </View>
  );
}
