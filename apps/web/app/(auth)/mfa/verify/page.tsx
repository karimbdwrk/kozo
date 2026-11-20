import { Suspense } from "react";

import { AuthCard } from "@/features/auth/components/auth-card";
import { MfaVerifyForm } from "@/features/auth/components/mfa-verify-form";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { t } from "@/lib/i18n";

export default function MfaVerifyPage() {
  return (
    <AuthCard
      title={t("auth.mfaVerify.title")}
      description={t("auth.mfaVerify.description")}
      footer={
        <>
          <p className="text-muted-foreground">{t("auth.mfaVerify.lostDevice")}</p>
          <SignOutButton />
        </>
      }
    >
      <Suspense fallback={<p>{t("common.loading")}</p>}>
        <MfaVerifyForm />
      </Suspense>
    </AuthCard>
  );
}
