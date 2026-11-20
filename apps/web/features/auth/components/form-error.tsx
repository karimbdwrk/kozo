import { Alert, AlertDescription } from "@/components/ui/alert";
import { t } from "@/lib/i18n";

export function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{t(error)}</AlertDescription>
    </Alert>
  );
}
