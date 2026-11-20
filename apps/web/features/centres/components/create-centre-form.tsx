"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createCentreSchema, slugify } from "@kozo/shared";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { FormField } from "@/features/auth/components/form-field";
import { useServerAction } from "@/features/auth/components/use-server-action";
import { createCentre } from "@/features/centres/actions";
import { t } from "@/lib/i18n";

export function CreateCentreForm() {
  const { state, submit, pending } = useServerAction(createCentre);
  const form = useForm({
    resolver: zodResolver(createCentreSchema),
    defaultValues: { name: "", slug: "" },
  });
  const errors = form.formState.errors;
  const nameField = form.register("name");

  return (
    <form noValidate className="grid gap-4" onSubmit={form.handleSubmit(submit)}>
      <FormError error={state.error} />
      <FormField
        id="name"
        autoComplete="organization"
        label={t("onboarding.fields.name")}
        error={errors.name?.message ?? state.fieldErrors?.name}
        {...nameField}
        onChange={(event) => {
          void nameField.onChange(event);
          // Suggest the address until the user edits it.
          if (!form.getFieldState("slug").isDirty) {
            form.setValue("slug", slugify(event.target.value));
          }
        }}
      />
      <FormField
        id="slug"
        autoCapitalize="none"
        spellCheck={false}
        label={t("onboarding.fields.slug")}
        hint={t("onboarding.fields.slugHint")}
        error={errors.slug?.message ?? state.fieldErrors?.slug}
        {...form.register("slug")}
      />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("onboarding.submit")}
      </Button>
    </form>
  );
}
