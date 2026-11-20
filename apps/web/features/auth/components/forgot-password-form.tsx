"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@kozo/shared";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/features/auth/actions";
import { t } from "@/lib/i18n";

import { FormError } from "./form-error";
import { FormField } from "./form-field";
import { useServerAction } from "./use-server-action";

export function ForgotPasswordForm() {
  const { state, submit, pending } = useServerAction(requestPasswordReset);
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  return (
    <form noValidate className="grid gap-4" onSubmit={form.handleSubmit(submit)}>
      <FormError error={state.error} />
      <FormField
        id="email"
        type="email"
        autoComplete="email"
        label={t("auth.fields.email")}
        error={form.formState.errors.email?.message ?? state.fieldErrors?.email}
        {...form.register("email")}
      />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("auth.forgotPassword.submit")}
      </Button>
    </form>
  );
}
