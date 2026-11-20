import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { t } from "@/lib/i18n";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost">
        {t("common.signOut")}
      </Button>
    </form>
  );
}
