import { AuthCard } from "@/features/auth/components/auth-card";
import { MfaEnroll } from "@/features/auth/components/mfa-enroll";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { t } from "@/lib/i18n";

export default function MfaEnrollPage() {
  return (
    <AuthCard
      title={t("auth.mfaEnroll.title")}
      description={t("auth.mfaEnroll.description")}
      footer={<SignOutButton />}
    >
      <MfaEnroll />
    </AuthCard>
  );
}
