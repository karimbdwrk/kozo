import { expect, test } from "@playwright/test";

// Journeys that do not need a real account (no Supabase writes, no e-mails).
// Full sign-up -> e-mail -> TOTP -> centre creation is tested manually for now.

test.describe("access control", () => {
  for (const path of ["/", "/centre-a", "/onboarding", "/mfa/verify", "/mfa/enroll"]) {
    test(`${path} requires signing in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
      await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    });
  }

  test("an invalid e-mail link shows an error page", async ({ page }) => {
    await page.goto("/auth/confirm?code=invalid&next=//evil.example");
    await expect(page).toHaveURL(/\/auth\/error$/);
    await expect(page.getByRole("heading", { name: "Lien invalide" })).toBeVisible();
  });
});

test.describe("sign-in form", () => {
  test("shows inline errors in French and does not submit", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page.getByText("Saisissez une adresse e-mail valide.")).toBeVisible();
    await expect(page.getByText("Saisissez votre mot de passe.")).toBeVisible();
    await expect(page.getByLabel("Adresse e-mail")).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("links to sign-up and password reset", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
    await expect(page.getByRole("heading", { name: "Mot de passe oublié" })).toBeVisible();
  });
});

test.describe("sign-up form", () => {
  test("enforces the password policy", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Prénom").fill("Jeanne");
    await page.getByLabel("Nom", { exact: true }).fill("Martin");
    await page.getByLabel("Adresse e-mail").fill("jeanne@example.fr");
    await page.getByLabel("Mot de passe").fill("court");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await expect(
      page.getByText("Le mot de passe doit contenir au moins 12 caractères."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });
});
