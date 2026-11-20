import { authErrorMessageKey } from "@kozo/shared";
import type { z } from "zod";

// Result of a form Server Action. Errors are message keys (translated in the UI).
export type ActionState = {
  error: string | null;
  fieldErrors?: Partial<Record<string, string>>;
  // Free-form data returned on success when the action does not redirect.
  data?: Record<string, string>;
};

export const initialActionState: ActionState = { error: null };

export function fromZodError(error: z.ZodError): ActionState {
  const fieldErrors: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".");
    fieldErrors[field] ??= issue.message;
  }
  return { error: null, fieldErrors };
}

export function fromAuthError(error: { code?: string | undefined } | null): ActionState {
  return { error: authErrorMessageKey(error?.code) };
}
