"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { totpCodeSchema } from "@kozo/shared";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { ActionState } from "@/features/auth/action-state";
import { confirmMfaEnrollment, startMfaEnrollment } from "@/features/auth/actions";
import { t } from "@/lib/i18n";

import { FormError } from "./form-error";
import { FormField } from "./form-field";
import { useServerAction } from "./use-server-action";

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function MfaEnroll() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, startTransition] = useTransition();

  const start = () => {
    startTransition(async () => {
      const result: ActionState = await startMfaEnrollment();
      const data = result.data;
      if (result.error || !data?.factorId || !data.qrCode || !data.secret) {
        setStartError(result.error ?? "common.genericError");
        return;
      }
      setStartError(null);
      setEnrollment({ factorId: data.factorId, qrCode: data.qrCode, secret: data.secret });
    });
  };

  if (!enrollment) {
    return (
      <div className="grid gap-4">
        <FormError error={startError} />
        <p className="text-sm">{t("auth.mfaEnroll.step1")}</p>
        <Button type="button" onClick={start} disabled={starting}>
          {starting ? t("common.loading") : t("auth.mfaEnroll.start")}
        </Button>
      </div>
    );
  }

  return <MfaEnrollConfirm enrollment={enrollment} />;
}

function MfaEnrollConfirm({ enrollment }: { enrollment: Enrollment }) {
  const { state, submit, pending } = useServerAction(confirmMfaEnrollment);
  const form = useForm({
    resolver: zodResolver(totpCodeSchema),
    defaultValues: { code: "" },
  });

  return (
    <div className="grid gap-4">
      <p className="text-sm">{t("auth.mfaEnroll.step2")}</p>
      <Image
        src={enrollment.qrCode}
        alt={t("auth.mfaEnroll.qrAlt")}
        width={192}
        height={192}
        unoptimized
        className="mx-auto rounded-md bg-white p-2"
      />
      <div className="grid gap-1">
        <p className="text-muted-foreground text-sm">{t("auth.mfaEnroll.manualKey")}</p>
        <code className="bg-muted rounded-md px-2 py-1 font-mono text-sm break-all select-all">
          {enrollment.secret}
        </code>
      </div>
      <form
        noValidate
        className="grid gap-4"
        onSubmit={form.handleSubmit((values) =>
          submit({ ...values, factorId: enrollment.factorId }),
        )}
      >
        <FormError error={state.error} />
        <FormField
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          label={t("auth.fields.totpCode")}
          hint={t("auth.mfaEnroll.step3")}
          error={form.formState.errors.code?.message ?? state.fieldErrors?.code}
          {...form.register("code")}
        />
        <Button type="submit" disabled={pending}>
          {pending ? t("common.loading") : t("auth.mfaEnroll.submit")}
        </Button>
      </form>
    </div>
  );
}
