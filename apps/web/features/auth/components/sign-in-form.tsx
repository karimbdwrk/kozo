"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema } from "@kozo/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { signIn } from "@/features/auth/actions";
import { t } from "@/lib/i18n";

import { FormError } from "./form-error";
import { FormField } from "./form-field";
import { useServerAction } from "./use-server-action";

export function SignInForm() {
  const next = useSearchParams().get("next") ?? undefined;
  const { state, submit, pending } = useServerAction(signIn);
  const form = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const errors = form.formState.errors;

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => submit({ ...values, next }))}
    >
      <FormError error={state.error} />
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
        autoComplete="current-password"
        label={t("auth.fields.password")}
        error={errors.password?.message ?? state.fieldErrors?.password}
        {...form.register("password")}
      />
      <Link href="/forgot-password" className="text-sm underline underline-offset-4">
        {t("auth.signIn.forgotPassword")}
      </Link>
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("auth.signIn.submit")}
      </Button>
    </form>
  );
}
