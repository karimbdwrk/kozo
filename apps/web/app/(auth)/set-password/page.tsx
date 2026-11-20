import { AuthCard } from "@/features/auth/components/auth-card";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";
import { t } from "@/lib/i18n";

// Reached from an invitation or password-reset link (the proxy requires a session).
export default function SetPasswordPage() {
  return (
    <AuthCard title={t("auth.setPassword.title")} description={t("auth.setPassword.description")}>
      <SetPasswordForm />
    </AuthCard>
  );
}
