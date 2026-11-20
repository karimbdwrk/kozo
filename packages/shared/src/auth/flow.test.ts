import { describe, expect, it } from "vitest";

import { resolveAuthStep, safeRedirectPath } from "./flow";

describe("resolveAuthStep", () => {
  it("asks to sign in without a session", () => {
    expect(resolveAuthStep({ hasSession: false })).toBe("sign-in");
  });

  it("asks to enroll a factor when the user has none", () => {
    expect(resolveAuthStep({ hasSession: true, currentLevel: "aal1", nextLevel: "aal1" })).toBe(
      "enroll-mfa",
    );
  });

  it("treats unknown levels as needing enrollment (fail closed)", () => {
    expect(resolveAuthStep({ hasSession: true, currentLevel: null, nextLevel: null })).toBe(
      "enroll-mfa",
    );
  });

  it("asks to verify when a factor exists but the session is aal1", () => {
    expect(resolveAuthStep({ hasSession: true, currentLevel: "aal1", nextLevel: "aal2" })).toBe(
      "verify-mfa",
    );
  });

  it("is authenticated at aal2", () => {
    expect(resolveAuthStep({ hasSession: true, currentLevel: "aal2", nextLevel: "aal2" })).toBe(
      "authenticated",
    );
  });
});

describe("safeRedirectPath", () => {
  it.each([
    ["/centre-a", "/centre-a"],
    ["/centre-a/planning?week=2", "/centre-a/planning?week=2"],
  ])("keeps internal path %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["https://evil.example"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["javascript:alert(1)"],
    ["/ok\nSet-Cookie:x"],
  ])("rejects %s", (input) => {
    expect(safeRedirectPath(input)).toBe("/");
  });
});
