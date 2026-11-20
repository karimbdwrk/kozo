import { describe, expect, it } from "vitest";

import {
  AUTH_ERROR,
  createCentreSchema,
  setPasswordSchema,
  signInSchema,
  signUpSchema,
  slugify,
  totpCodeSchema,
} from "./schemas";

function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("signInSchema", () => {
  it("normalizes the email", () => {
    const parsed = signInSchema.parse({ email: "  Jean@Example.FR ", password: "x" });
    expect(parsed.email).toBe("jean@example.fr");
  });

  it("rejects an invalid email with a message key", () => {
    expect(firstError(signInSchema.safeParse({ email: "nope", password: "x" }))).toBe(
      AUTH_ERROR.emailInvalid,
    );
  });
});

describe("signUpSchema", () => {
  const valid = {
    firstName: "Jeanne",
    lastName: "Martin",
    email: "jeanne@example.fr",
    password: "a-long-enough-pass",
  };

  it("accepts a valid signup", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("requires at least 12 characters", () => {
    expect(firstError(signUpSchema.safeParse({ ...valid, password: "short" }))).toBe(
      AUTH_ERROR.passwordTooShort,
    );
  });

  it("rejects passwords longer than 72 characters", () => {
    expect(firstError(signUpSchema.safeParse({ ...valid, password: "a".repeat(73) }))).toBe(
      AUTH_ERROR.passwordTooLong,
    );
  });

  it("requires names", () => {
    expect(firstError(signUpSchema.safeParse({ ...valid, firstName: "  " }))).toBe(
      AUTH_ERROR.nameRequired,
    );
  });
});

describe("setPasswordSchema", () => {
  it("requires both passwords to match", () => {
    const result = setPasswordSchema.safeParse({
      password: "a-long-enough-pass",
      confirmPassword: "another-long-pass",
    });
    expect(firstError(result)).toBe(AUTH_ERROR.passwordsDoNotMatch);
  });
});

describe("totpCodeSchema", () => {
  it.each(["123456", " 654321 "])("accepts %s", (code) => {
    expect(totpCodeSchema.safeParse({ code }).success).toBe(true);
  });

  it.each(["12345", "1234567", "abcdef", ""])("rejects %s", (code) => {
    expect(firstError(totpCodeSchema.safeParse({ code }))).toBe(AUTH_ERROR.totpInvalid);
  });
});

describe("createCentreSchema", () => {
  it("accepts a valid centre", () => {
    expect(createCentreSchema.safeParse({ name: "Centre A", slug: "centre-a" }).success).toBe(true);
  });

  it.each(["-centre", "centre-", "Centre A", "a", "ce_ntre"])("rejects slug %s", (slug) => {
    expect(firstError(createCentreSchema.safeParse({ name: "Centre", slug }))).toBe(
      AUTH_ERROR.slugInvalid,
    );
  });
});

describe("slugify", () => {
  it("builds a slug from a French name", () => {
    expect(slugify("Formation Été — Lyon Sud")).toBe("formation-ete-lyon-sud");
  });

  it("produces a slug accepted by the schema", () => {
    const slug = slugify("Centre de formation professionnelle de la région Auvergne-Rhône-Alpes");
    expect(createCentreSchema.safeParse({ name: "x x", slug }).success).toBe(true);
  });
});
