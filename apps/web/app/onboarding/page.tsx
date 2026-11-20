import { Suspense } from "react";

import { AuthCard } from "@/features/auth/components/auth-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { CreateCentreForm } from "@/features/centres/components/create-centre-form";
import { requireAal2 } from "@/lib/auth/guards";
import { t } from "@/lib/i18n";

async function GuardedForm() {
  await requireAal2();
  return <CreateCentreForm />;
}

export default function OnboardingPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <AuthCard
        title={t("onboarding.title")}
        description={t("onboarding.description")}
        footer={<SignOutButton />}
      >
        <Suspense fallback={<p>{t("common.loading")}</p>}>
          <GuardedForm />
        </Suspense>
      </AuthCard>
    </main>
  );
}
