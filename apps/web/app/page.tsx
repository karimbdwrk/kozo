import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { requireAal2 } from "@/lib/auth/guards";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

// Entry point after sign-in: route the user to their centre.
async function CentreRouter() {
  await requireAal2();
  const supabase = await createClient();
  // RLS only returns centres where the user has an active membership.
  const { data: centres, error } = await supabase
    .from("organizations")
    .select("name, slug")
    .order("name")
    .limit(50);

  if (error) {
    return <p role="alert">{t("common.genericError")}</p>;
  }
  if (!centres || centres.length === 0) redirect("/onboarding");
  if (centres.length === 1 && centres[0]) redirect(`/${centres[0].slug}`);

  return (
    <nav aria-label={t("home.chooseCentre")} className="grid w-full max-w-md gap-2">
      <h1 className="text-xl font-semibold">{t("home.chooseCentre")}</h1>
      <ul className="grid gap-2">
        {centres.map((centre) => (
          <li key={centre.slug}>
            <Link
              href={`/${centre.slug}`}
              className="hover:bg-muted block rounded-lg border p-4 focus-visible:outline-2"
            >
              {centre.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<p>{t("common.loading")}</p>}>
        <CentreRouter />
      </Suspense>
    </main>
  );
}
