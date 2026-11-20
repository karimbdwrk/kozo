import { Suspense, type ReactNode } from "react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireCentre } from "@/features/centres/queries";
import { t } from "@/lib/i18n";

async function CentreName({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const centre = await requireCentre(orgSlug);
  return <span className="font-semibold">{centre.organization.name}</span>;
}

export default function CentreLayout({ children, params }: LayoutProps<"/[orgSlug]">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Suspense fallback={<span>{t("common.loading")}</span>}>
          <CentreName params={params} />
        </Suspense>
        <SignOutButton />
      </header>
      {children satisfies ReactNode}
    </div>
  );
}
