import Link from "next/link";
import { Suspense } from "react";

import { AuthCard } from "@/features/auth/components/auth-card";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  return (
    <AuthCard
      title={t("auth.signIn.title")}
      description={t("auth.signIn.description")}
      footer={
        <p>
          {t("auth.signIn.noAccount")}{" "}
          <Link href="/signup" className="underline underline-offset-4">
            {t("auth.signIn.signUpLink")}
          </Link>
        </p>
      }
    >
      <Suspense fallback={<p>{t("common.loading")}</p>}>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
