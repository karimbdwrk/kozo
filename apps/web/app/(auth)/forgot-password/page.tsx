import Link from "next/link";

import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { t } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title={t("auth.forgotPassword.title")}
      description={t("auth.forgotPassword.description")}
      footer={
        <Link href="/login" className="underline underline-offset-4">
          {t("common.backToSignIn")}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
