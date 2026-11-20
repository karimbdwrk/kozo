"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { totpCodeSchema } from "@kozo/shared";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { verifyMfa } from "@/features/auth/actions";
import { t } from "@/lib/i18n";

import { FormError } from "./form-error";
import { FormField } from "./form-field";
import { useServerAction } from "./use-server-action";

export function MfaVerifyForm() {
  const next = useSearchParams().get("next") ?? undefined;
  const { state, submit, pending } = useServerAction(verifyMfa);
  const form = useForm({
    resolver: zodResolver(totpCodeSchema),
    defaultValues: { code: "" },
  });

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => submit({ ...values, next }))}
    >
      <FormError error={state.error} />
      <FormField
        id="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        label={t("auth.fields.totpCode")}
        error={form.formState.errors.code?.message ?? state.fieldErrors?.code}
        {...form.register("code")}
      />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("auth.mfaVerify.submit")}
      </Button>
    </form>
  );
}
