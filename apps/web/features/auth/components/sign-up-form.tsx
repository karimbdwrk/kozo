"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema } from "@kozo/shared";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { signUp } from "@/features/auth/actions";
import { t } from "@/lib/i18n";

import { FormError } from "./form-error";
import { FormField } from "./form-field";
import { useServerAction } from "./use-server-action";

export function SignUpForm() {
  const { state, submit, pending } = useServerAction(signUp);
  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });
  const errors = form.formState.errors;

  return (
    <form noValidate className="grid gap-4" onSubmit={form.handleSubmit(submit)}>
      <FormError error={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="firstName"
          autoComplete="given-name"
          label={t("auth.fields.firstName")}
          error={errors.firstName?.message ?? state.fieldErrors?.firstName}
          {...form.register("firstName")}
        />
        <FormField
          id="lastName"
          autoComplete="family-name"
          label={t("auth.fields.lastName")}
          error={errors.lastName?.message ?? state.fieldErrors?.lastName}
          {...form.register("lastName")}
        />
      </div>
      <FormField
        id="email"
        type="email"
        autoComplete="email"
        label={t("auth.fields.email")}
        error={errors.email?.message ?? state.fieldErrors?.email}
        {...form.register("email")}
      />
      <FormField
        id="password"
        type="password"
        autoComplete="new-password"
        label={t("auth.fields.password")}
        hint={t("auth.fields.passwordHint")}
        error={errors.password?.message ?? state.fieldErrors?.password}
        {...form.register("password")}
      />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("auth.signUp.submit")}
      </Button>
    </form>
  );
}
