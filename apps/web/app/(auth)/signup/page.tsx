import Link from "next/link";

import { AuthCard } from "@/features/auth/components/auth-card";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { t } from "@/lib/i18n";

export default function SignUpPage() {
  return (
    <AuthCard
      title={t("auth.signUp.title")}
      description={t("auth.signUp.description")}
      footer={
        <p>
          {t("auth.signUp.hasAccount")}{" "}
          <Link href="/login" className="underline underline-offset-4">
            {t("auth.signUp.signInLink")}
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
