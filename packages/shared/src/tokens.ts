// Design tokens shared by web (Tailwind 4 CSS variables) and mobile (Gluestack/NativeWind).
// Placeholder palette: to be replaced by the real brand colors.
export const colors = {
  primary: "#2563eb",
  primaryForeground: "#ffffff",
  background: "#ffffff",
  foreground: "#0f172a",
  muted: "#f1f5f9",
  mutedForeground: "#64748b",
  border: "#e2e8f0",
  destructive: "#dc2626",
  success: "#16a34a",
  warning: "#d97706",
} as const;

export type ColorToken = keyof typeof colors;
