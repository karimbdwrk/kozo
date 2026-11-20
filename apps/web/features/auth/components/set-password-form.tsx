"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { setPasswordSchema } from "@kozo/shared";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { setPassword } from "@/features/auth/actions";
import { t } from "@/lib/i18n";

import { FormError } from "./form-error";
import { FormField } from "./form-field";
import { useServerAction } from "./use-server-action";

export function SetPasswordForm() {
  const { state, submit, pending } = useServerAction(setPassword);
  const form = useForm({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const errors = form.formState.errors;

  return (
    <form noValidate className="grid gap-4" onSubmit={form.handleSubmit(submit)}>
      <FormError error={state.error} />
      <FormField
        id="password"
        type="password"
        autoComplete="new-password"
        label={t("auth.fields.newPassword")}
        hint={t("auth.fields.passwordHint")}
        error={errors.password?.message ?? state.fieldErrors?.password}
        {...form.register("password")}
      />
      <FormField
        id="confirmPassword"
        type="password"
        autoComplete="new-password"
        label={t("auth.fields.confirmPassword")}
        error={errors.confirmPassword?.message ?? state.fieldErrors?.confirmPassword}
        {...form.register("confirmPassword")}
      />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("auth.setPassword.submit")}
      </Button>
    </form>
  );
}
