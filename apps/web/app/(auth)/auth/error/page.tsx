import Link from "next/link";

import { AuthCard } from "@/features/auth/components/auth-card";
import { t } from "@/lib/i18n";

export default function AuthErrorPage() {
  return (
    <AuthCard
      title={t("auth.error.title")}
      description={t("auth.errors.linkInvalid")}
      footer={
        <Link href="/login" className="underline underline-offset-4">
          {t("common.backToSignIn")}
        </Link>
      }
    />
  );
}
