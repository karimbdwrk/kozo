import { z } from "zod";

// Validation shared by web and mobile. Error messages are message KEYS:
// each app translates them from its own message file (no hard-coded UI text).

export const AUTH_ERROR = {
  emailInvalid: "auth.errors.emailInvalid",
  passwordTooShort: "auth.errors.passwordTooShort",
  passwordTooLong: "auth.errors.passwordTooLong",
  passwordRequired: "auth.errors.passwordRequired",
  passwordsDoNotMatch: "auth.errors.passwordsDoNotMatch",
  nameRequired: "auth.errors.nameRequired",
  nameTooLong: "auth.errors.nameTooLong",
  totpInvalid: "auth.errors.totpInvalid",
  centreNameInvalid: "onboarding.errors.centreNameInvalid",
  slugInvalid: "onboarding.errors.slugInvalid",
} as const;

export const PASSWORD_MIN_LENGTH = 12;
// bcrypt (used by Supabase Auth) ignores bytes beyond 72.
export const PASSWORD_MAX_LENGTH = 72;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: AUTH_ERROR.emailInvalid }).max(254, AUTH_ERROR.emailInvalid));

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, AUTH_ERROR.passwordTooShort)
  .max(PASSWORD_MAX_LENGTH, AUTH_ERROR.passwordTooLong);

const personNameSchema = z
  .string()
  .trim()
  .min(1, AUTH_ERROR.nameRequired)
  .max(100, AUTH_ERROR.nameTooLong);

export const signInSchema = z.object({
  email: emailSchema,
  // No length rule at sign-in: never reveal the password policy to a guesser.
  password: z.string().min(1, AUTH_ERROR.passwordRequired).max(PASSWORD_MAX_LENGTH),
});

export const signUpSchema = z.object({
  firstName: personNameSchema,
  lastName: personNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const setPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: AUTH_ERROR.passwordsDoNotMatch,
    path: ["confirmPassword"],
  });

export const totpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, AUTH_ERROR.totpInvalid),
});

// Mirrors the organizations.slug check constraint in the database.
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/;

export const createCentreSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, AUTH_ERROR.centreNameInvalid)
    .max(200, AUTH_ERROR.centreNameInvalid),
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN, AUTH_ERROR.slugInvalid),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type TotpCodeInput = z.infer<typeof totpCodeSchema>;
export type CreateCentreInput = z.infer<typeof createCentreSchema>;

// Suggest a slug from a centre name ("Formation Lyon Sud" -> "formation-lyon-sud").
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}
