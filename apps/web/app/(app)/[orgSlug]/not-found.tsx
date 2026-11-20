import Link from "next/link";

import { t } from "@/lib/i18n";

export default function CentreNotFound() {
  return (
    <main className="grid gap-4 px-4 py-6">
      <p role="alert">{t("dashboard.notFound")}</p>
      <Link href="/" className="underline underline-offset-4">
        {t("home.chooseCentre")}
      </Link>
    </main>
  );
}
