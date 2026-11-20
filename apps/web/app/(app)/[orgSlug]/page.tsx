import { Suspense } from "react";

import { requireCentre } from "@/features/centres/queries";
import { t } from "@/lib/i18n";

async function Dashboard({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  // Access is checked again here (layouts and pages render independently).
  await requireCentre(orgSlug);
  return <p className="text-muted-foreground">{t("dashboard.empty")}</p>;
}

export default function CentrePage({ params }: PageProps<"/[orgSlug]">) {
  return (
    <main className="grid gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
      <Suspense fallback={<p>{t("common.loading")}</p>}>
        <Dashboard params={params} />
      </Suspense>
    </main>
  );
}
