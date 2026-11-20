import "@/global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaListener } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { AuthProvider, useAuth } from "@/features/auth/auth-provider";

// Each screen group is reachable only at its step of the flow:
// sign in -> TOTP setup or verification (mandatory) -> app.
function RootNavigator() {
  const { loading, step } = useAuth();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={loading}>
        <Stack.Screen name="loading" />
      </Stack.Protected>
      <Stack.Protected guard={!loading && step === "sign-in"}>
        <Stack.Screen name="(auth)/sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={!loading && step === "enroll-mfa"}>
        <Stack.Screen name="(mfa)/enroll" />
      </Stack.Protected>
      <Stack.Protected guard={!loading && step === "verify-mfa"}>
        <Stack.Screen name="(mfa)/verify" />
      </Stack.Protected>
      <Stack.Protected guard={!loading && step === "authenticated"}>
        <Stack.Screen name="(app)/index" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GluestackUIProvider mode="system">
          <AuthProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </AuthProvider>
        </GluestackUIProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
