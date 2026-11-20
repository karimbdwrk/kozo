import { ActivityIndicator, Pressable, Text } from "react-native";

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "ghost";
};

// Min 48pt high (touch target), announces its busy state to screen readers,
// ignores presses while loading (no double submission).
export function Button({ label, onPress, loading = false, variant = "primary" }: ButtonProps) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center rounded-lg px-4 ${
        primary ? "bg-primary" : "bg-transparent"
      } ${loading ? "opacity-60" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={primary ? "white" : undefined} />
      ) : (
        <Text
          className={`text-base font-semibold ${primary ? "text-primary-foreground" : "text-foreground"}`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
