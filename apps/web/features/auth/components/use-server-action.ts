"use client";

import { startTransition, useActionState } from "react";

import { initialActionState, type ActionState } from "@/features/auth/action-state";

type FormAction = (prev: ActionState, input: unknown) => Promise<ActionState>;

// Wraps a Server Action for react-hook-form: client validation runs first,
// then the validated values are sent; `pending` disables the submit button
// (no double submission).
export function useServerAction(action: FormAction) {
  const [state, dispatch, pending] = useActionState(action, initialActionState);
  const submit = (values: unknown) => {
    startTransition(() => dispatch(values));
  };
  return { state, submit, pending };
}
