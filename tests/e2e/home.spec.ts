import { expect, test } from "@playwright/test";

test("loads the QST editor", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "QuizForge" })).toBeVisible();
  await expect(page.getByText("QST Parser Studio")).toBeVisible();
  await expect(page.getByText("No parser issues detected.")).toBeVisible();
});
