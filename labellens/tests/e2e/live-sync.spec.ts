// End-to-end journey (needs a configured Supabase + seeded users): a customer uploads on one "phone" and the inspector's
// "laptop" dashboard shows the new scan live without a page refresh.
import { test, expect } from "@playwright/test";
import path from "node:path";

// Signs a browser context in with the given email/password env vars and lands on the dashboard.
async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

test("customer upload appears live on the inspector dashboard", async ({ browser }) => {
  const phone = await (await browser.newContext()).newPage();
  const laptop = await (await browser.newContext()).newPage();
  await login(laptop, "inspector@labellens.test", process.env.SEED_INSPECTOR_PASSWORD!);
  await login(phone, "customer@labellens.test", process.env.SEED_CUSTOMER_PASSWORD!);

  const title = `e2e-${Date.now()}`;
  await phone.goto("/scan/new");
  await phone.getByLabel("Title (optional)").fill(title);
  await phone.getByLabel("Front of pack").setInputFiles(path.join(__dirname, "fixture.jpg"));
  await phone.getByRole("button", { name: /Upload 1 photo/ }).click();

  // No reload on the laptop: the Realtime subscription must deliver the row.
  await expect(laptop.getByText(title)).toBeVisible({ timeout: 15000 });
});
