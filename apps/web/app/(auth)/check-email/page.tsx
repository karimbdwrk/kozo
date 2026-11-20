import Link from "next/link";

import { AuthCard } from "@/features/auth/components/auth-card";
import { t } from "@/lib/i18n";

export default function CheckEmailPage() {
  return (
    <AuthCard
      title={t("auth.checkEmail.title")}
      description={t("auth.checkEmail.description")}
      footer={
        <Link href="/login" className="underline underline-offset-4">
          {t("common.backToSignIn")}
        </Link>
      }
    />
  );
}
